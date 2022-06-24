const db = require('./db1.js')

function addData(data){

  return new Promise((resolve, reject) => {
    const {id, num, str} = data
    db.run('INSERT INTO SERVICE1 (ID, NUM, STR) VALUES (@id, @num, @str)', {id , num, str})
    resolve()
  })
  
}

function deleteData(id){
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM SERVICE1 WHERE ID = @id', {id})
    resolve()
  })
}


module.exports = {
  addData,
  deleteData,
}
