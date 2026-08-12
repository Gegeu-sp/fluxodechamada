import { auth } from './firebase-config.js';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// Não há tela de autocadastro em nenhum lugar do app: contas só existem se
// criadas manualmente pelo responsável do projeto no Console do Firebase.
export function watchAuth(onUser, onGuest) {
  return onAuthStateChanged(auth, user => (user ? onUser(user) : onGuest()));
}

export function login(email, senha) {
  return signInWithEmailAndPassword(auth, email, senha);
}

export function logout() {
  return signOut(auth);
}
