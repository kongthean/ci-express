/* ================================================================
   CI Express – settings. This is the ONLY file you need to edit.
   ================================================================ */
window.CI_CONFIG = {
  // 1) Paste your Firebase web config here
  //    (Firebase Console > Project settings > Your apps > Web app > Config)
  firebase: {
    apiKey: "AIzaSyAZgSYmSmXygeCxKk-WmJYOd6Dj32F0IvM",
    authDomain: "ci-express-26f32.firebaseapp.com",
    databaseURL: "https://ci-express-26f32-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ci-express-26f32",
    storageBucket: "ci-express-26f32.firebasestorage.app",
    messagingSenderId: "69550146363",
    appId: "1:69550146363:web:645315e02b3fce63442d1e"
  },

  // 2) Your website address (used in QR codes on labels)
  site: "https://cambodiainsight.com",

  // 3) Login domain. Staff log in as  username@staff.<loginDomain>
  //    and customers as  c<phone>@cust.<loginDomain>.
  //    NEVER change this after you start, or every login stops working.
  //    It must match the domain written in database.rules.json.
  loginDomain: "cambodiainsight.com",

  // 4) Company details printed on labels
  company: {
    name: "CI Express",
    hotline: "",          // e.g. "012 000 000"
    currency: "USD"       // default currency for new shipments: USD or KHR
  },

  // 5) Firebase Functions region (only if you use the AI auto call)
  functionsRegion: "asia-southeast1"
};
