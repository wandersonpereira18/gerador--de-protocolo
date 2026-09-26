/* ---------------------------------------------------------
   FIREBASE — configuração do projeto
   Tudo deste sistema fica no nó "protocolos/" do Realtime
   Database, separado dos dados do delivery.
   --------------------------------------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyAeq4paPyDV8IH9e_NmY-K-EQ0-NYNQS18",
  authDomain: "projeto-delivery-wanderson.firebaseapp.com",
  databaseURL: "https://projeto-delivery-wanderson-default-rtdb.firebaseio.com",
  projectId: "projeto-delivery-wanderson",
  storageBucket: "projeto-delivery-wanderson.firebasestorage.app",
  messagingSenderId: "350994128828",
  appId: "1:350994128828:web:23ac8cc4dd05d2f1ec15b9",
  measurementId: "G-MESR5ZCZ6E",
};

/* Quem se cadastrar com este e-mail vira administrador automaticamente.
   (Precisa ser o mesmo e-mail que está nas regras do banco.) */
const ADMIN_EMAIL = "wandersonpereira18@gmail.com";

/* Raiz dos dados deste sistema no Realtime Database */
const DB_ROOT = "protocolos";

firebase.initializeApp(firebaseConfig);
firebase.auth().languageCode = "pt";
