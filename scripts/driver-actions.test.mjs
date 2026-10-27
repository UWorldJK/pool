import assert from "node:assert/strict";
import test,{after,beforeEach,mock} from "node:test";
import {registerAuthTestLoader} from "./auth-test-loader.mjs";
const loader=registerAuthTestLoader();
let authenticated=true;
const rpc=mock.fn(async()=>({data:"awaiting_confirmation",error:null}));
mock.module(new URL("../src/lib/supabase/server.ts",import.meta.url).href,{exports:{createClient:async()=>({auth:{getUser:async()=>({data:{user:authenticated?{id:"actor",email:"adult@example.test",email_confirmed_at:"yes"}:null},error:null})},rpc})}});
mock.module("next/cache",{exports:{revalidatePath:mock.fn()}});
const {driverAction}=await import("../src/app/app/driver-actions.ts");
loader.deregister();after(()=>mock.restoreAll());
const family=crypto.randomUUID(),child=crypto.randomUUID(),proposal=crypto.randomUUID(),vehicle=crypto.randomUUID(),driver=crypto.randomUUID(),ride=crypto.randomUUID();
function form(values){const data=new FormData();for(const [k,v] of Object.entries(values))for(const x of Array.isArray(v)?v:[v])data.append(k,x);return data;}
const base={proposal_id:proposal,revision:"3",family_id:family,child_ids:[child],confirm:"yes",vehicle_id:vehicle,label:"Own car",passenger_seats:"4",version:"0",available_seats:"4",restraints:"yes",ride_id:ride,driver_vehicle:[driver,family,vehicle,"1"].join("|")};
const commands=["saveVehicle","proposeDriver","acceptDriverProposal","consentForOwnChildren","declineDriverProposal","cancelDriverProposal","withdrawDriver","revokeOwnConsent"];
beforeEach(()=>{authenticated=true;rpc.mock.resetCalls();rpc.mock.mockImplementation(async()=>({data:"awaiting_confirmation",error:null}));});
test("every driver action reauthenticates and ignores forged prior success",async()=>{authenticated=false;for(const command of commands)assert.match((await driverAction({message:"Confirmed"},form({...base,command}))).error,/Sign in/);assert.equal(rpc.mock.callCount(),0);});
test("nomination binds selection and request ID; driver acceptance never implies child consent",async()=>{
  await driverAction({},form({...base,command:"proposeDriver",actor_id:"spoof",status:"confirmed"}));
  const [name,args]=rpc.mock.calls[0].arguments;assert.equal(name,"propose_driver");assert.equal(args.p_driver_id,driver);assert.equal(args.p_vehicle_version,1);assert.equal(args.p_id,proposal);assert.equal(Object.hasOwn(args,"p_actor_id"),false);
  await driverAction({},form({...base,command:"acceptDriverProposal"}));assert.equal(rpc.mock.calls[1].arguments[0],"accept_driver_proposal");assert.equal(rpc.mock.calls[1].arguments[1].p_restraints,true);assert.equal(Object.hasOwn(rpc.mock.calls[1].arguments[1],"p_child_ids"),false);
});
test("malformed seats, child IDs, duplicate children, version and missing acknowledgments stop before RPC",async()=>{
  for(const change of [{command:"saveVehicle",passenger_seats:"0"},{command:"saveVehicle",passenger_seats:"1.5"},{command:"saveVehicle",version:"-1"},{command:"proposeDriver",driver_vehicle:"bad"},{command:"acceptDriverProposal",restraints:""},{command:"acceptDriverProposal",confirm:""},{command:"consentForOwnChildren",child_ids:[]},{command:"consentForOwnChildren",child_ids:[child,child]},{command:"revokeOwnConsent",child_ids:["spoof"]},{command:"withdrawDriver",confirm:""}])assert.ok((await driverAction({},form({...base,...change}))).error);
  assert.equal(rpc.mock.callCount(),0);
});
test("database conflicts/deadlines/authority remain failures for all actions, never fabricated success",async()=>{
  for(const command of commands)for(const [code,pattern] of [["PT404",/unavailable/],["PT409",/Reload/],["PT410",/deadline/],["PT422",/restraint/],["PT423",/Resolve/],["PT424",/overlapping/],["XX000",/could not save/]]){
    rpc.mock.mockImplementation(async()=>({data:null,error:{code,message:"private database detail"}}));const result=await driverAction({},form({...base,command}));assert.match(result.error,pattern);assert.equal(result.message,undefined);assert.equal(result.path,undefined);
  }
  rpc.mock.mockImplementation(async()=>({data:"confirmed",error:null}));assert.match((await driverAction({},form({...base,command:"consentForOwnChildren"}))).message,/Confirmed/);
});
