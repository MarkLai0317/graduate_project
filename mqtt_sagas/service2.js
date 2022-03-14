const dbService2 = require('./requires/dbservice2.js')
var mqtt = require('mqtt');
var client = mqtt.connect('mqtt://localhost:8888', {clientId: 'second_subscriber'});
var option = {
    qos: 2
}



function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}

client.on('connect', ()=>{
    console.log("connect success");
    client.subscribe('service2', option);
})

function respond(data){
  let originalData = dbService2.getCount(1);
  dbService2.updateCount(1)
  let response = {
    service: 2,
    originalData: originalData,
    transactionId: data.transactionId,
  }
  console.log(response);
  client.publish(data.transientId, JSON.stringify(response))
}


client.on('message', (topic, message, packet)=>{
    
  
  let data = JSON.parse(message)
  console.log(JSON.parse(message))

  if(data.response == false){
    respond(data)
  }
  // get final response and check response_block
  else if(data.abort == true){
    
    const {id, count} = data.originalData
    dbService2.recover(id, count)
   
  }

  console.log('\n\n')

})







 