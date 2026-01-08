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

    
    ws.send("CONNECTED")
    
  
      
      ws.on("message", async(data) => {
        const event = JSON.parse(data);
        const eventData = event.data;
        if (event.event === "JOIN_CONVERSATION"){
          if (!eventData.conversationId || !mongoose.Types.ObjectId.isValid(eventData.conversationId)){
            sendWsError(ws,"Invalid ConversationID") 
            return;
          }
          const conversation = await Conversation.findById(eventData.conversationId);
          if (!conversation) {
          sendWsError(ws,"Conversation doesn't exist");
          return ;
          }
         if (ws.user.role == "candidate" || ws.user.role == "agent" ){
            if (ws.user.role== "agent"){
              conversation.status = "assigned"
             await conversation?.save(); 
            }

          }else{
          sendWsError(ws,"Forbidden for this role");
          return ;
            }
          if (conversation?.status ==="closed"){
            sendWsError(ws,"conversation already closed") 
            return;
          }
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
  if (ws.user.role == "candidate" || ws.user.role == "agent" ){

  }else{
      sendWsError(ws,"Forbidden for this role");
      return ;
  }

   const room = rooms.get(`conversation:${eventData.conversationId}`)
    if (!room?.includes(ws)){
      sendWsError(ws,"You must join the conversation first");
      return ;
    }
    const message = {
      senderId: ws.user.userId,
      senderRole: ws.user.role,
      content: eventData.content,
      createdAt: new Date().toISOString()
    }
    if (!MessageMap.get(eventData.conversationId)){

      MessageMap.set(eventData.conversationId,[]);
    }
    const messageArray = MessageMap.get(eventData.conversationId);
    messageArray?.push(message);

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
    console.log("msgs for this conv",MessageMap.get(eventData.conversationId))

  }
  if (event.event === "LEAVE_CONVERSATION"){
     const event = JSON.parse(data);
    const eventData = event.data;  
    const conversationId = eventData.conversationId
   
 if (ws.user.role == "candidate" || ws.user.role == "agent" ){

  }else{
      sendWsError(ws,"Forbidden for this role");
      return ;
  }


   const room = rooms.get(`conversation:${eventData.conversationId}`)
  if (!room?.includes(ws)){
      sendWsError(ws,"You must join the conversation first");
      return ;
    }
   if (!room){
     sendWsError(ws,"Conversation doesn't exist");
      return ;
   }
   console.log("members after leaving",room.length)
   const userIndex = room.findIndex((user)=>user.user.userId == ws.user.userId);
   room.splice(userIndex,1);
  console.log("members after leaving",room.length)
  if (room.length == 0){
    rooms.delete(`conversation:${eventData.conversationId}`);
  }
  let payload = {
    conversationId:eventData.conversationId
  }
  sendWsSuccess(ws,"LEFT_CONVERSATION",payload);



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


