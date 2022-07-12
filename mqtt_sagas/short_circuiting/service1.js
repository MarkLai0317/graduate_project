const dbService1 = require('../requires/dbservice1.js')

var Mutex = require('async-mutex').Mutex;
const mutex = new Mutex();

var EventEmitter = require('events');
class ConfirmMessageEmitter extends EventEmitter {}
const confirmMessageEmitter = new ConfirmMessageEmitter();
var requestQueue = []
// for lock before commit

var mqtt = require('mqtt');
var client = mqtt.connect('mqtt://localhost:1883', {clientId: 'first_subscriber'});
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

const confirmMessageListener = (transactionId) => {
  return new Promise((resolve, reject) => {
    // This assumes that the events are mutually exclusive
    confirmMessageEmitter.on(transactionId, (data)=>{
      resolve(data);
    })
   
  })
};



const abort = async (confirmData) => {
  try{
    result = await dbService1.deleteData(confirmData.compensate[0].id)
  }
  catch(err){
    return new Promise((resolve, reject) => {
      reject(err)
    })
  }
  return new Promise((resolve, reject) => {
    resolve(result)
  })
}


const confirm = async (confirmData) => {

  if(confirmData.abort && confirmData.reject === false){
    await abort(confirmData)
  }

  client.publish()

  return new Promise((resolve, reject) => {
    resolve()
  })

  // return new Promise(async (resolve, reject) => {
  //   await abort()
  //   resolve()
  // })
  
}




const requestHandler =  async (data) => {
  let reject = true //  service reject

  if(mutex.isLocked()){
    let response = {
      transactionId:data.transactionId,
      ack: false,
      fail: true,
      serviceId:'service1',
      reject: reject,
      compensate:[] ,
    }
    client.publish(data.transientId, JSON.stringify(response))

    return
  }
  let release = await mutex.acquire()




  if(!reject){
     await dbService1.addData(data)
  }
  
  let response = {
    transactionId:data.transactionId,
    ack: false,
    serviceId:'service1',
    reject: reject,
    compensate:[] ,
  }
  if(!reject){
    response.compensate = [
      {
        operation:'Insert',
        id: data.id
      },
    ] 
  }
  console.log(response);

  client.publish(data.transientId, JSON.stringify(response))

  let confirmData = await confirmMessageListener(data.transactionId)

  // if(confirmData.abort && confirmData.reject == false){
  //   await abort()
  // }
  //console.log(confirmData)
  await confirm(confirmData)
 
  release()

  client.publish(confirmData.transientId, JSON.stringify({
    transactionId: confirmData.transactionId,
    ack: true,
    serviceId: 'service1',
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








 
