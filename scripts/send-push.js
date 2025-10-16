const webpush = require('web-push');
const fs = require('fs');

const vapid = JSON.parse(fs.readFileSync('vapid.json', 'utf-8')); 
const sub   = JSON.parse(fs.readFileSync('subscription.json', 'utf-8')); 

webpush.setVapidDetails(
  'mailto:you@example.com',
  vapid.publicKey,
  vapid.privateKey
);

const payload = JSON.stringify({
  title: 'Hola desde Web Push 🎉',
  body: 'Notificación de prueba Sin Backend',
  url: '/' 
});

webpush.sendNotification(sub, payload)
  .then((res) => {
    console.log('OK', res.statusCode);
  })
  .catch((err) => {
    console.error('ERROR', err.statusCode, err.body || err);
  });
