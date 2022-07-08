const dbService2 = require('./requires/dbservice2.js')

var Mutex = require('async-mutex').Mutex;
const mutex = new Mutex();

var EventEmitter = require('events');
class ConfirmMessageEmitter extends EventEmitter {}
const confirmMessageEmitter = new ConfirmMessageEmitter();

var mqtt = require('mqtt');
var client = mqtt.connect('mqtt://localhost:1883', {clientId: 'second_subscriber'});
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

const confirmMessageListener = (transactionId) => {
  return new Promise((resolve, reject) => {
    // This assumes that the events are mutually exclusive
    confirmMessageEmitter.on(transactionId, (data)=>{
      resolve(data);
    })
   
  })
};

const confirm = async  (confirmData) => {
  if(confirmData.abort && confirmData.reject === false){
    const serviceId = confirmData.compensate[0].id
    await dbService2.recover(serviceId)
  }

  return new Promise((resolve, reject) => {
    resolve()
  })
}

const requestHandler =  async (data) => {
  
  let release = await mutex.acquire()
  
  let reject = false // service reject
  let response = {
    transactionId: data.transactionId,
    service: 2,
    reject: reject,
    compensate:[],
  }
  if(!reject){
    await dbService2.updateCount(1)
    response.compensate = [
      {
        operation: 'Update',
        id: 1,
      }
    ]
  }
  
  console.log(response);
  client.publish(data.transientId, JSON.stringify(response))

  let confirmData = await confirmMessageListener(data.transactionId)
  await confirm(confirmData)

  release()


  client.publish(confirmData.transientId, JSON.stringify({
    transactionId: confirmData.transactionId,
    ack: true,
    serviceId: 'service2',
  }))

}


client.on('message', (topic, message, packet)=>{
    
  
  let data = JSON.parse(message)
  console.log(JSON.parse(message))

  if(data.response === false){
    requestHandler(data)
  }
  // get final response and check response_block
  else{
    confirmMessageEmitter.emit(data.transactionId, data)
  }

  console.log('\n\n')

})







 
