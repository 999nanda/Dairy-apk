var firebaseConfig = {
  apiKey: "AIzaSyAtmDkYLV6rh4jfJT2OPJZ5_R4c99S8-t4",
  authDomain: "nanda-dairy-agro-b5888.firebaseapp.com",
  databaseURL: "https://nanda-dairy-agro-b5888-default-rtdb.firebaseio.com",
  projectId: "nanda-dairy-agro-b5888",
  storageBucket: "nanda-dairy-agro-b5888.firebasestorage.app",
  messagingSenderId: "284932687587",
  appId: "1:284932687587:web:1613d832d65dabfb5f67d6"
};

var db = null;
try {
  if (window.firebase && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  if (window.firebase) {
    db = firebase.database();
  }
} catch (e) {
  console.log(e);
}
