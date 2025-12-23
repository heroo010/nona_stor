// استيراد وحدات Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    push, 
    set, 
    update, 
    remove, 
    onValue,
    get,
    child 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { 
    getStorage, 
    ref as storageRef, 
    uploadBytes, 
    getDownloadURL,
    deleteObject 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

// إعدادات Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA6iAGu1vLGuMmLIpwWKL_VACU2dcHAzV4",
    authDomain: "shb-swrr.firebaseapp.com",
    databaseURL: "https://shb-swrr-default-rtdb.firebaseio.com",
    projectId: "shb-swrr",
    storageBucket: "shb-swrr.appspot.com",
    messagingSenderId: "280555279732",
    appId: "1:280555279732:web:2613b6be7225e0524f8821",
    measurementId: "G-W5NL890PWT"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

// تصدير الدوال والكائنات
export { 
    db, storage, ref, push, set, update, remove, onValue, get, child,
    storageRef, uploadBytes, getDownloadURL, deleteObject 
};