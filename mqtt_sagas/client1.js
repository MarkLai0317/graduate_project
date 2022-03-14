const { v4: uuidv4 } = require('uuid');
var mqtt = require('mqtt')
var client1 = mqtt.connect('mqtt://localhost:8888', {clientId : 'client1'})

var topic = 'topic'
var option = {  
    qos:2,
}

var counter = 0

function callService1(transactionId, counter){
  let message1 = {
    response: false,
    transactionId: transactionId,
    id: uuidv4(), // used as response topic
    num : counter,
    str : 'hi'
  }
  
  console.log(message1)
  client1.subscribe(message1.id, option)
  console.log('subscribe1')
  client1.publish('service1', JSON.stringify(message1));
}

function callService2(transactionId){
  let message2 = {
    response:false,
    transactionId: transactionId,
    transientId: uuidv4(), // used as response topic
  }
  console.log(message2)
  client1.subscribe(message2.transientId, option)
  console.log('subscribe2')
  client1.publish('service2', JSON.stringify(message2))
}

class ServiceState {
  constructor(transactionId) {
    this.transactionId = transactionId;  
    this.service1 = 0;
    this.service2 = 0;
  }
}

var confirmList = []

client1.on('connect', ()=>{
    console.log("client1 connect!!");
    setInterval(()=>{

      let transactionId = uuidv4()
      confirmList.push(new ServiceState(transactionId))
      
      callService1(transactionId, counter)
      callService2(transactionId)
      counter += 1;
    }, 2000);
})

function checkServiceState(transactionId){
  return new Promise((resolve, reject)=>{
    let state = confirmList.find(x => x.transactionId === transactionId)
    while(state.service1 === 0 || state.service2 === 0){
      console.log("check1")
    }
    resolve( state.service1 === 1 && state.service2 === 1)
  })
}



async function confirmService1(data){
  
  client1.unsubscribe(data.id)
  if(data.num % 2 == 0){ //abort
    confirmList.find(x => x.transactionId === data.transactionId).service1 = -1
  }
  else{ // confirm
    confirmList.find(x => x.transactionId === data.transactionId).service1 = 1
  }
  
  const success = await checkServiceState(data.transactionId)
  console.log('await')
  let response = {
    response: true,
    id: data.id,
    abort : true,
  }
  if(success){ //confirm
    response.abort = false 
  }
  client1.publish('service1',JSON.stringify(response))

}

// service2 控制成功失敗
const service2succeeded = true

async function confirmService2(data){
  client1.unsubscribe(data.transientId)
  if(!service2succeeded){
    confirmList.find(x => x.transactionId === data.transactionId).service2 = -1
  }
  else{ // confirm
    confirmList.find(x => x.transactionId === data.transactionId).service2 = 1
  }
  console.log('await2')
  const success = await checkServiceState(data.transactionId)

  if(!success){
    let response = {
      response: true,
      originalData: data.originalData,
      abort: true
    }
    cnosole.log('abort2')
    client1.publish('service2', JSON.stringify(response))
  }
  else{
    let response = {
      response: true,
      abort:false
    }
    client1.publish('service2', JSON.stringify(response))
  }
  
}





client1.on('message', (topic, message, packet)=>{
  let data = JSON.parse(message)
  console.log('confirming')
  if(data.service == 1){
    confirmService1(data)
  }
  else if (data.service == 2){
    confirmService2(data)
  }

})