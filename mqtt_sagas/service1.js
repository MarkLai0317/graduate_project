const dbService1 = require('./requires/dbservice1.js')
var mqtt = require('mqtt');
var client = mqtt.connect('mqtt://localhost:8888', {clientId: 'first_subscriber'});
var option = {
    qos: 2
}

client.on('connect', ()=>{
  console.log("connect success");
  client.subscribe('service1', option);
})


function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
}


const respond = (data) => {
  dbService1.addData(data)
  let response = {
    compensate:[
      {
        operation:'Insert',
        id: data.id
      },
    ] ,
    transactionId:data.transactionId,
    service:1,
    num: getRandomInt(1,10)
  }
  console.log(response);
  client.publish(data.transientId, JSON.stringify(response))
}

const abort = (data) => {
  dbService1.deleteData(data.compensate[0].id)
  console.log('abort')
}


client.on('message', (topic, message, packet)=>{
    
  
  let data = JSON.parse(message)
  console.log(JSON.parse(message))

  if(data.response == false){
    respond(data)
  }
  // get final response and check response_block
  else if(data.abort ){
    abort(data)
  }

  console.log('\n\n')

})








 