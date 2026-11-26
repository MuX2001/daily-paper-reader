interface Sodium {
  ready: Promise<unknown>;
  base64_variants: {ORIGINAL:number};
  from_base64(value:string,variant:number):Uint8Array;
  from_string(value:string):Uint8Array;
  crypto_box_seal(value:Uint8Array,key:Uint8Array):Uint8Array;
  to_base64(value:Uint8Array,variant:number):string;
}
declare global { interface Window { sodium?:Sodium } }

export async function seal(sodium:Sodium, publicKey:string, secret:string){
  await sodium.ready;
  const encoding=sodium.base64_variants.ORIGINAL;
  const bytes=sodium.from_string(secret);
  try{return sodium.to_base64(sodium.crypto_box_seal(bytes,sodium.from_base64(publicKey,encoding)),encoding);}
  finally{bytes.fill(0);}
}
