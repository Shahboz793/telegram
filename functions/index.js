const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
admin.initializeApp();

const BOT_TOKEN = "BOT_TOKENINGIZ";

exports.notifyOnBooking = functions.firestore
  .document("taxis/{id}")
  .onUpdate(async(change)=>{
    const before = change.before.data();
    const after = change.after.data();
    if(after.seats < before.seats){
      const text =
`🚕 Yangi buyurtma!
📍 ${after.route}
📌 1 ta joy band qilindi
🪑 Qolgan joylar: ${after.seats}`;
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ chat_id: after.ownerId, text })
      });
    }
  });
