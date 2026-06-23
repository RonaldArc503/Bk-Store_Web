const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getDatabase } = require('firebase-admin/database')

initializeApp()

async function assertCallerIsAdmin(callerUid) {
  const snapshot = await getDatabase().ref(`userAuthIndex/${callerUid}`).get()
  if (!snapshot.exists()) {
    throw new HttpsError('permission-denied', 'No autorizado')
  }

  const role = snapshot.val()?.role
  if (role !== 'Administrador') {
    throw new HttpsError('permission-denied', 'Solo administradores pueden cambiar contraseñas')
  }
}

async function findAuthUidsForUserId(userId) {
  const snapshot = await getDatabase().ref('userAuthIndex').get()
  if (!snapshot.exists()) return []

  const uids = []
  snapshot.forEach((child) => {
    if (child.val()?.userId === userId) {
      uids.push(child.key)
    }
  })
  return uids
}

exports.adminChangeUserPassword = onCall(async (request) => {
  const callerUid = request.auth?.uid
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'Debe iniciar sesión como administrador')
  }

  await assertCallerIsAdmin(callerUid)

  const userId = String(request.data?.userId || '').trim()
  const newPassword = String(request.data?.newPassword || '')

  if (!userId) {
    throw new HttpsError('invalid-argument', 'Usuario inválido')
  }
  if (!newPassword || newPassword.length < 6) {
    throw new HttpsError('invalid-argument', 'La contraseña debe tener al menos 6 caracteres')
  }

  const userSnapshot = await getDatabase().ref(`users/${userId}`).get()
  if (!userSnapshot.exists()) {
    throw new HttpsError('not-found', 'Usuario no encontrado en el sistema')
  }

  const user = userSnapshot.val()
  const email = String(user.email || '').trim().toLowerCase()
  if (!email) {
    return { synced: true, mode: 'rtdb-only' }
  }

  const adminAuth = getAuth()
  const authUids = await findAuthUidsForUserId(userId)

  if (authUids.length > 0) {
    await Promise.all(authUids.map((uid) => adminAuth.updateUser(uid, { password: newPassword })))
    return { synced: true, mode: 'updated-existing', count: authUids.length }
  }

  try {
    const existing = await adminAuth.getUserByEmail(email)
    await adminAuth.updateUser(existing.uid, { password: newPassword })
    return { synced: true, mode: 'updated-by-email' }
  } catch (error) {
    const code = error?.code || error?.errorInfo?.code || ''
    if (code !== 'auth/user-not-found') {
      throw new HttpsError('internal', 'No se pudo actualizar Firebase Authentication')
    }
  }

  const created = await adminAuth.createUser({
    email,
    password: newPassword,
    emailVerified: false,
  })

  return { synced: true, mode: 'created', uid: created.uid }
})
