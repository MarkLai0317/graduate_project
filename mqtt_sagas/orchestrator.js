


const { v4: uuidv4 } = require('uuid');

//const { PerformanceObserver, performance } = require('perf_hooks');
const process = require('process');
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

  findService(serviceId) {
    return this.services.find(x => x.serviceId === serviceId)
  }

  respondServices(success){
  
    this.services.forEach((service) => {
      let response = {
  
        response: true,
        transactionId: this.transactionId,
        transientId: service.transientId,
        reject: service.reject,
        compensate: service.compensate,
        abort: !success
      }
      client1.publish(service.serviceId, JSON.stringify(response))
    })
  }

  allAcked(){
    return this.services.every(service => service.ack === true)
  }

  unsubscribeAllTransient(){
    this.services.forEach((service) => {
      client1.unsubscribe(service.transientId);
    })
  }

  servicesStateCheck(state){
    return this.services.every(service => service.state === state);
  }

  allReturn(){
    return this.services.every(service => service.state != 0)
  }




}

// client status
const service1fail = true
const service2fail = false
// reject is service status


var confirmList = {}
var totalRequestNum = 500
var RequestNum = 0

client1.on('connect', async()=>{
    console.log("client1 connect!!");
    
    // 先發1000個

    startClientTime = process.hrtime()
    for(var i=0; i<totalRequestNum; i++){
      let transactionId = uuidv4()
      let transientId1 = uuidv4()
      let transientId2 = uuidv4()
      confirmList[transactionId] = new ServiceState(transactionId, [transientId1, transientId2])
      callService1(transactionId, transientId1,counter)
      callService2(transactionId, transientId2,)
      counter += 1;
    }
    
    
})








function confirmService(transientTopic, serviceId, data, checkfunction){
//  client1.unsubscribe(transientTopic)
  let serviceState = confirmList[data.transactionId]
  let service = serviceState.findService(serviceId)
  service.compensate = data.compensate
  service.reject = data.reject
  service.state = 1
  // self define check if stat is 1 or -1
  checkfunction(service, data)

  myEmitter.emit('service_response', serviceState)
  
}






async function ack(data){
  
  let transactionContext = confirmList[data.transactionId]
  // let ackrelease = transactionContext.Ackmutex.acquire()
  transactionContext.findService(data.serviceId).ack = true


  if(transactionContext.allAcked()){
    console.log(data.transactionId+' acked')
    transactionContext.unsubscribeAllTransient()

   

    delete confirmList[data.transactionId]
   
    RequestNum += 1
    if( totalRequestNum === RequestNum){
      let endClientTime = process.hrtime(startClientTime)
      console.log('took ' + ((endClientTime[0]*1000) + endClientTime[1]/1000000))

    }
      
  }
  // ackrelease()



}


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


myEmitter.on('service_response', (stateObj) => {
  console.log('response');

  
  if(stateObj.allReturn()){
    console.log('responding')
    let success = stateObj.servicesStateCheck(1);
    //respondServices(success, stateObj)
    stateObj.respondServices(success)
    // remove transaction from confirmList
    // let index = confirmList.findIndex(x => x.transactionId === stateObj.transactionId);
    // confirmList.splice(index, 1);
  }

});



