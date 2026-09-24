import admin from 'firebase-admin';
import { Resend } from 'resend';

// Inicializar Firebase Admin SDK si no está inicializado
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Manejar escapes de línea nueva en Vercel env vars
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

const db = admin.firestore();
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Opcional: Proteger el endpoint usando un secreto que envía el Vercel Cron
  if (
    process.env.CRON_SECRET &&
    req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Iniciando proceso de recordatorios...');
    const usersSnapshot = await db.collection('users').get();
    let emailsSent = 0;

    // Calcular la fecha actual en formato YYYY-MM-DD
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const emailPromises = [];

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const settings = userData.settings || { reminderDays: 1 };
      
      // Si configuró 0 días o no tiene tareas, ignorar
      if (settings.reminderDays === 0 || !userData.tasks || userData.tasks.length === 0) {
        return;
      }

      // Calcular fecha objetivo (hoy + reminderDays)
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + settings.reminderDays);
      const targetDateStr = targetDate.toISOString().slice(0, 10);

      const dueTasks = userData.tasks.filter(task => {
        return task.status !== 'done' && task.dueDate === targetDateStr;
      });

      if (dueTasks.length > 0) {
        // Generar contenido del email
        let htmlContent = `<h2>¡Hola! Tienes tareas próximas a vencer en Onestudy</h2>`;
        htmlContent += `<p>Este es un recordatorio de que tienes las siguientes tareas programadas para vencer en ${settings.reminderDays} día(s) (<strong>${targetDateStr}</strong>):</p><ul>`;
        
        dueTasks.forEach(task => {
          htmlContent += `<li><strong>${task.title}</strong> (Prioridad: ${task.priority})</li>`;
        });
        htmlContent += `</ul><p>¡Mucho éxito con tu estudio!</p>`;

        // Obtenemos el email real del usuario desde Firebase Auth
        const emailPromise = admin.auth().getUser(userDoc.id).then(userRecord => {
          if (userRecord.email) {
            console.log(`Preparando correo para ${userRecord.email}`);
            return resend.emails.send({
              from: 'Onestudy <onestudy@resend.dev>', // Usa el dominio verificado en Resend en prod
              to: userRecord.email,
              subject: 'Recordatorio de Tareas - Onestudy',
              html: htmlContent
            }).then(() => {
              emailsSent++;
            }).catch(e => {
              console.error(`Error enviando a ${userRecord.email}:`, e);
            });
          }
        }).catch(e => {
           console.error(`Error obteniendo usuario auth ${userDoc.id}:`, e);
        });

        emailPromises.push(emailPromise);
      }
    });

    await Promise.all(emailPromises);

    console.log(`Proceso completado. Se enviaron ${emailsSent} correos.`);
    res.status(200).json({ success: true, emailsSent });
  } catch (error) {
    console.error('Error al procesar recordatorios:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
