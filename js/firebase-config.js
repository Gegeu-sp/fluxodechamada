// Configuração do Firebase — PREENCHER com os valores reais do Console:
// https://console.firebase.google.com/project/fluxo-aula/settings/general
// (Configurações do projeto > Seus apps > app Web > SDK setup and configuration > Config)
//
// A apiKey de um app Web do Firebase NÃO é segredo — pode ficar neste arquivo
// commitado normalmente. A segurança real vem das Firestore Security Rules
// (ver firestore.rules), não de esconder esta config.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'COLE_AQUI_A_API_KEY',
  authDomain: 'fluxo-aula.firebaseapp.com',
  projectId: 'fluxo-aula',
  storageBucket: 'fluxo-aula.appspot.com',
  messagingSenderId: '175771227677',
  appId: 'COLE_AQUI_O_APP_ID',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Em desenvolvimento local (servido em localhost), conecta nos emuladores
// do Firebase em vez do projeto real — usado pela verificação automatizada
// e útil para qualquer pessoa testar o app localmente sem afetar dados reais.
// Ver README de verificação em specs/002-firebase-presenca-real/verification-report.md.
if (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  } catch (e) {
    // já conectado (hot-reload) ou emulador indisponível — segue com o projeto real
  }
}
