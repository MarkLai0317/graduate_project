const db = require('./db.js')

function addData(data){
  const {id, num, str} = data
  db.run('INSERT INTO SERVICE1 (ID, NUM, STR) VALUES (@id, @num, @str)', {id , num, str})
}

function deleteData(id){
  
  db.run('DELETE FROM SERVICE1 WHERE ID = @id', {id})
}


module.exports = {
  addData,
  deleteData,
}
