import { useState } from "react";
import { api } from "../api.js";
import { INK, FONT } from "../lib/ui.js";

export function LoginScreen({onLogged,notice=""}){
  const [login,setLogin]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState(notice);
  const [busy,setBusy]=useState(false);

  const submit=async e=>{
    e.preventDefault();
    if(busy)return;
    setBusy(true);setError("");
    try{
      const {user}=await api.login(login,password);
      onLogged(user);
    }catch(err){
      setError(err.message);
      setPassword("");
    }finally{
      setBusy(false);
    }
  };

  const field={width:"100%",background:"#0a0a0a",border:"1px solid #333",borderRadius:10,
    padding:"12px 14px",color:"#fff",fontSize:15,outline:"none",boxSizing:"border-box"};

  return(
    <div style={{background:"#0a0a0a",minHeight:"100vh",display:"flex",alignItems:"center",
      justifyContent:"center",padding:20,fontFamily:FONT,color:"#f1f1f1"}}>
      <form onSubmit={submit} style={{width:"100%",maxWidth:360,background:"#161616",
        border:"1px solid #1e1e1e",borderRadius:16,padding:28}}>
        <h1 style={{margin:"0 0 4px",fontSize:24,fontWeight:700}}>🐟 Śledzik 🐠</h1>
        <p style={{margin:"0 0 22px",color:"#888",fontSize:13}}>Zaloguj się, aby zobaczyć swoje dane.</p>

        <label style={{fontSize:12,color:"#888",display:"block",marginBottom:6}}>Login</label>
        <input value={login} onChange={e=>setLogin(e.target.value)} autoFocus autoComplete="username"
          style={{...field,marginBottom:14}}/>

        <label style={{fontSize:12,color:"#888",display:"block",marginBottom:6}}>Hasło</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
          autoComplete="current-password" style={{...field,marginBottom:18}}/>

        {error&&(
          <div style={{background:"#2a0f0f",border:"1px solid #6b2020",borderRadius:10,
            padding:"10px 12px",color:"#f87171",fontSize:13,marginBottom:16}}>{error}</div>
        )}

        <button type="submit" disabled={busy||!login||!password}
          style={{width:"100%",padding:"13px",borderRadius:10,border:"none",fontWeight:700,fontSize:15,
            background:busy||!login||!password?"#222":"linear-gradient(135deg,#667eea,#764ba2)",
            color:busy||!login||!password?INK.muted:"#fff",
            cursor:busy||!login||!password?"not-allowed":"pointer"}}>
          {busy?"Logowanie…":"Zaloguj"}
        </button>

        <p style={{margin:"18px 0 0",color:INK.muted,fontSize:11,lineHeight:1.6}}>
          Rejestracja jest zamknięta. Konto zakłada administrator instancji
          skryptem <code style={{color:INK.soft}}>create-user.sh</code>.
        </p>
      </form>
    </div>
  );
}

