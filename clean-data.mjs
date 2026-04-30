import { initializeApp } from 'firebase/app'
import { getDatabase, ref, get, remove } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyCYwUKZkiNYH4gtwLG-VIRqf1P1NXH90NY',
  authDomain: 'shopbikinistore.firebaseapp.com',
  databaseURL: 'https://shopbikinistore-default-rtdb.firebaseio.com',
  projectId: 'shopbikinistore',
  storageBucket: 'shopbikinistore.firebasestorage.app',
  messagingSenderId: '1025416534253',
  appId: '1:1025416534253:web:744ca97ce62085a3f414e4',
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

const TIMEOUT = 15000
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms))
  ])
}

async function showAndClean() {
  console.log('--- Leyendo datos actuales ---')

  try {
    const cajasSnap = await withTimeout(get(ref(db, 'cajas')), TIMEOUT)
    console.log('cajas existe:', cajasSnap.exists(), '| registros:', cajasSnap.exists() ? Object.keys(cajasSnap.val()).length : 0)
  } catch (e) {
    console.log('cajas: error leyendo -', e.message)
  }

  try {
    const cortesSnap = await withTimeout(get(ref(db, 'cortes')), TIMEOUT)
    console.log('cortes existe:', cortesSnap.exists(), '| registros:', cortesSnap.exists() ? Object.keys(cortesSnap.val()).length : 0)
  } catch (e) {
    console.log('cortes: error leyendo -', e.message)
  }

  console.log('\n--- Eliminando datos ---')

  try {
    await withTimeout(remove(ref(db, 'cajas')), TIMEOUT)
    console.log('✓ cajas eliminado')
  } catch (e) {
    console.log('✗ cajas: error eliminando -', e.message)
  }

  try {
    await withTimeout(remove(ref(db, 'cortes')), TIMEOUT)
    console.log('✓ cortes eliminado')
  } catch (e) {
    console.log('✗ cortes: error eliminando -', e.message)
  }

  try {
    await withTimeout(remove(ref(db, 'userActiveCaja')), TIMEOUT)
    console.log('✓ userActiveCaja eliminado')
  } catch (e) {
    console.log('✗ userActiveCaja: error eliminando -', e.message)
  }

  console.log('\n--- Verificando ---')
  try {
    const check1 = await withTimeout(get(ref(db, 'cajas')), TIMEOUT)
    const check2 = await withTimeout(get(ref(db, 'cortes')), TIMEOUT)
    console.log('cajas ahora:', check1.exists() ? 'TIENE DATOS' : 'VACÍO ✓')
    console.log('cortes ahora:', check2.exists() ? 'TIENE DATOS' : 'VACÍO ✓')
  } catch (e) {
    console.log('Error verificando:', e.message)
  }

  console.log('\n¡Proceso completado!')
  process.exit(0)
}

showAndClean().catch((err) => {
  console.error('Error general:', err.message)
  process.exit(1)
})
