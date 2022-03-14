const db = require('./db.js')


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

function getCount(id){
  try{
    return db.query(`SELECT *
                    FROM CALLCOUNT
                    WHERE serviceId = ?`, [id])[0];
  }
  catch (err) {
    console.error(err)
  }
}

function recover(id, count){
  console.log('recover')
  try{
    db.run(`UPDATE CALLCOUNT
            SET count = @count
            WHERE serviceId = @id`, {count, id});
  }
  catch (err) {
    console.error(err)
  }
}

module.exports = {
  updateCount,
  getCount,
  recover
}