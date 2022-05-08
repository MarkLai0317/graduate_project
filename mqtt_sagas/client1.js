const { v4: uuidv4 } = require('uuid');

//event emitter
var EventEmitter = require('events');
class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter();

var Mutex = require('async-mutex').Mutex;
const contextListMutex = new Mutex();

var mqtt = require('mqtt')
var client1 = mqtt.connect('mqtt://localhost:1883', {clientId : 'client1'})



var option = {  
    qos:2,
}

var counter = 0

function callService1(transactionId, transientId, counter){
  let message1 = {
    response: false,
    transactionId: transactionId,
    transientId:transientId,
    id: uuidv4(), 
    num : counter,
    str : 'hi'
  }
  
  console.log(message1)
  client1.subscribe(message1.transientId, option)
  console.log('subscribe1')
  client1.publish('service1', JSON.stringify(message1));
}

function callService2(transactionId,  transientId) {
  let message2 = {
    response:false,
    transactionId: transactionId,
    transientId: transientId, // used as response topic
  }
  console.log(message2)
  client1.subscribe(message2.transientId, option)
  console.log('subscribe2')
  client1.publish('service2', JSON.stringify(message2))
}

class ServiceState {
  constructor(transactionId, transientIdList) {
    this.transactionId = transactionId;
    
    this.services = [
      {
        serviceId: 'service1',
        state: 0,  // -1 = fail,  1 = success
        ack: false,
        reject: false,
        transientId: '',
        compensate:[] // 補償操作
      },
      {
        serviceId: 'service2',
        state: 0, 
        ack: false, // -1 = fail,  1 = success
        reject: false,
        transientId: '',
        compensate:[] // 補償操作
      }
    ]
    for(var i=0; i < this.services.length; i++) {
      this.services[i].transientId = transientIdList[i]
    }
  }
}

var confirmList = []

client1.on('connect', ()=>{
    console.log("client1 connect!!");
    
    for(var i=0; i<5; i++){
      let transactionId = uuidv4()
      let transientId1 = uuidv4()
      let transientId2 = uuidv4()
      confirmList.push(new ServiceState(transactionId, [transientId1, transientId2]))
      callService1(transactionId, transientId1,counter)
      callService2(transactionId, transientId2,)
      counter += 1;
    }
    
})








function confirmService(transientTopic, serviceId, data, checkfunction){
//  client1.unsubscribe(transientTopic)
  let serviceState = confirmList.find(x => x.transactionId === data.transactionId)
  let service = serviceState.services.find(x => x.serviceId === serviceId)
  service.compensate = data.compensate
  service.reject = data.reject
  service.state = 1
  // self define check if stat is 1 or -1
  checkfunction(service, data)

  myEmitter.emit('service_response', serviceState)
  
}


function respondServices(success, transactionContext){
  
  transactionContext.services.forEach((service) => {
    let response = {

      response: true,
      transactionId: transactionContext.transactionId,
      transientId: service.transientId,
      reject: service.reject,
      compensate: service.compensate,
      abort: !success
    }
    client1.publish(service.serviceId, JSON.stringify(response))
  })
}

function allAcked(services){
  return services.every(service => service.ack === true)
}

function unsubscribeAllTransient(services){
  services.forEach((service) => {
    client1.unsubscribe(service.transientId);
  })
}

async function ack(data){
  
  let transactionContext = confirmList.find(x => x.transactionId === data.transactionId)
  transactionContext.services.find(x => x.serviceId === data.serviceId).ack = true

  if(allAcked(transactionContext.services)){
    console.log(data.transactionId+' acked')
    unsubscribeAllTransient(transactionContext.services)

    let release = await contextListMutex.acquire()

    let index = confirmList.findIndex(x => x.transactionId === data.transactionId)
    confirmList.splice(index, 1);

    release()
  }

  //Ackmutex.release()



}

// client status
const service1fail = false
const service2fail = false
// reject is service status

client1.on('message', (topic, message, packet)=>{
  let data = JSON.parse(message)
  
  if(data.ack){
    ack(data)
  }
  else if(data.service === 1){
    confirmService(topic, 'service1', data, (service, data)=>{
      if(data.reject || service1fail){ //abort
        service.state = -1
      }
      else{ // confirm
        service.state = 1
      }
    })
  }
  else if (data.service === 2){
    confirmService(topic, 'service2', data, (service, data)=>{
      if(data.reject || service2fail){ //abort
        service.state = -1
      }
      else{ // confirm
        service.state = 1
      }
    })
  }

  

})

 // check service.state all == state
function servicesStateCheck(services, state){
  return services.every(service => service.state === state);
}

function allReturn(services){
  return services.every(service => service.state != 0)
}

myEmitter.on('service_response', (stateObj) => {
  console.log('response');

  
  if(allReturn(stateObj.services)){
    console.log('responding')
    let success = servicesStateCheck(stateObj.services, 1);
    respondServices(success, stateObj)
    // remove transaction from confirmList
    // let index = confirmList.findIndex(x => x.transactionId === stateObj.transactionId);
    // confirmList.splice(index, 1);
  }

});



