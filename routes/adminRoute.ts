import { Router } from "express";
import mongoose from "mongoose";
import { Conversation, User } from "../models";




const adminRoute = Router(); 

adminRoute.get("/analytics",async(req,res)=>{
    const payload = req.body.payload;

  if (!payload.userId || !mongoose.Types.ObjectId.isValid(payload.userId)){
        return res.status(400).json({
            success:false,
            error:"Invalid Schema"
        })
    }
 if (payload.role !== "admin"){
         return res.status(403).json({
            success:false,
            error:"Forbidden, insufficient permissions"
        })
    }
    

  const analytics =  await User.aggregate([
        {
            $match:{
                role:"supervisor"
            }

    }, 
    {
        $lookup:{
            from:"users",
            localField:"_id",
            foreignField:"supervisorId",
            as:"agents"
        }
    },
    {
        $lookup:{
            from:"conversations",
            localField:"_id",
            foreignField:"supervisorId",
            as:"convos"
        }
    },
    {
        $project:{
            supervisorId: "$_id",
            supervisorName: "$name",
            agents: {$size: "$agents"},
            conversationHandles:{$size : "$convos"}
        }
    }
])
console.log("analytics ",analytics)
return res.status(200).json({
    success:true,
    data:analytics
})

})


export default adminRoute;