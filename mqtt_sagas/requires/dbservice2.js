const db = require('./db2.js')


function updateCount(id){
  try {
    db.run(`UPDATE CALLCOUNT
            SET count = 1 + count
            WHERE serviceId = @id`, {id});
  }
  catch (err) {
    console.error(err)
  } 
}

// async function getCount(id){
//   return new Promise(async (resolve, reject) => {
//     try{
//       let result =  await db.query(`SELECT *
//                                 FROM CALLCOUNT
//                                 WHERE serviceId = ?`, [id])[0];
//       resolve(result)
//     }

//     catch (err) {
//       console.error(err)
//       reject(err)
//     }

//   })
 
 
// }

function recover(id){
  
  return new Promise((resolve, reject) => {
    console.log('recover'+id)
    try{
      db.run(`UPDATE CALLCOUNT
              SET count = count - 1
              WHERE serviceId = @id`, {id});
      resolve()
    }
    catch (err) {
      console.error(err)
      reject(err)
    }
  })
}

module.exports = {
  updateCount,
  recover
}