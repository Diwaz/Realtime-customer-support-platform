import express from "express";
import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import mongodb from "mongodb"
import http from "http";
import routes from "./routes";
import mongoose from "mongoose";
import url from "url";
import { MessageMap } from "./routes/conversationRoute";
import { Conversation, User } from "./models";
import { eventNames } from "cluster";


const app = express();

const server = http.createServer(app);


const wss = new WebSocketServer({
  server
});
type RoomMembers = WebSocket[];
const rooms = new Map<String,RoomMembers>();

const connectDB = async () =>{
  try {

    await  mongoose.connect(process.env.DATABASE_URL!);
    console.log("mongo connected")
  }catch(err){
      console.log("error connecting to db",err)
  }
}

await connectDB();
wss.on("connection",async (ws,req)=>{
  const uri = url.parse(req.url,true).query
  // const convId = uri.id;
  const token = uri.token
  
 try{
   const payload = jwt.verify(token,"HGJHGJHGJFFJ");
    ws.user ={
      userId: payload.userId,
      role:payload.role
    }
    const role = payload.role;
    // let conversation;
    // if (role === "candidate"){
    //    conversation = await Conversation.find({candidateId:userId});   
    // }else if(role === "supervisor") {
    //     conversation = await Conversation.find({supervisorId:userId});
    // }else if (role === "agent"){
    //   conversation = await Conversation.find({agentId:userId});
    // }else {
    //    throw Error("Invalid User"); 
    // }
    // const convId = conversation.id;
    // console.log("user ws",ws.user)
    
    ws.send("CONNECTED")
    
    ws.on("close",(ws)=>{
        console.log("existed room");
        rooms.delete(ws);
      })
      
      ws.on("message", async(data) => {
        const event = JSON.parse(data);
        const eventData = event.data;
        if (event.event === "JOIN_CONVERSATION"){
          if (!eventData.conversationId || !mongoose.Types.ObjectId.isValid(eventData.conversationId)){
            sendWsError(ws,"Invalid ConversationID") 
            return;
          }
          const conversation = await Conversation.findById(eventData.conversationId)
          console.log("conv found",conversation)
          let payload ={
            conversationId:conversation?.id,
            status:conversation?.status
          }
          // rooms.set(ws,`conversation:${eventData.conversationId}:`);
          if (!rooms.get(`conversation:${eventData.conversationId}`)){
            rooms.set(`conversation:${eventData.conversationId}`,[]);
          }
          const room = rooms.get(`conversation:${eventData.conversationId}`)
          room?.push(ws);
      sendWsSuccess(ws,"JOINED_CONVERSATION",payload)
  // ws.send(
  //  JSON.stringify({ "conv": "JOINED"})
  // )
  }
  if (event.event === "SEND_MESSAGE"){
   const event = JSON.parse(data);
  const eventData = event.data;   
   const room = rooms.get(`conversation:${eventData.conversationId}`)
    if (!room?.includes(ws)){
      sendWsError(ws,"Not in Room");
      return ;
    }
    const message = {
      senderId: ws.user.userId,
      senderRole: ws.user.role,
      content: eventData.content,
      createdAt: new Date().toISOString()
    }
    MessageMap.set(eventData.conversationId,message);
    let payload = {
      conversationId: eventData.conversationId,
      senderId: ws.user.userId,
      senderRole: ws.user.role,
      content: eventData.content,
      createdAt: new Date().toISOString()
    }
    room.forEach((user)=>{
      console.log("user id of socker",user.user.userId)
      if (user.user.userId !== ws.user.userId){
        
        sendWsSuccess(ws,"NEW_MESSAGE",payload)
      }
    }) 
    console.log("msg event sent")
  }

}



)
 } catch(err){
  
   sendWsError(ws,"Unauthorized or invalid token")

 }

}

)

const sendWsError = (ws:WebSocket,error:string)=>{
  const payload ={
    event:"ERROR",
    data:{
      message:error
    }

  }
  ws.send(JSON.stringify(payload))
  ws.close(101,JSON.stringify(payload))
}
const sendWsSuccess = (ws:WebSocket,event:string,data)=>{
  const payload ={
    event:event,
    data
  }
  ws.send(JSON.stringify(payload));
}
const sendWsMessage = (ws:WebSocket,event:string,data)=>{
  const payload ={
    event:event,
    data
  }
  // const room = rooms.get(``)
  ws.send(JSON.stringify(payload));
}
app.get("/health", (req: express.Request, res: express.Response) => {
  return res.status(200).json({
    "health": "ok"
  })
})
app.use(express.json());
app.use(routes);

server.listen(3000, () => {
  console.log("server started");

})


