// Server-side DeepL proxy: API key never reaches the browser.
module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'POST required'});}
  const key=process.env.DEEPL_API_KEY;
  if(!key)return res.status(503).json({error:'DEEPL_API_KEY is not configured'});
  const texts=req.body?.texts;
  if(!Array.isArray(texts)||texts.length>50||texts.some(t=>typeof t!=='string'||t.length>4000))return res.status(400).json({error:'Invalid translation payload'});
  if(!texts.length)return res.status(200).json({translations:[]});
  const url=key.endsWith(':fx')?'https://api-free.deepl.com/v2/translate':'https://api.deepl.com/v2/translate';
  try{
    const upstream=await fetch(url,{method:'POST',headers:{'Authorization':'DeepL-Auth-Key '+key,'Content-Type':'application/json'},body:JSON.stringify({text:texts,source_lang:'HU',target_lang:'EN'})});
    if(!upstream.ok)return res.status(502).json({error:'DeepL translation failed (HTTP '+upstream.status+')'});
    const data=await upstream.json();
    if(!Array.isArray(data.translations)||data.translations.length!==texts.length)throw Error('Unexpected translation response');
    return res.status(200).json({translations:data.translations.map(x=>x.text)});
  }catch(e){return res.status(502).json({error:'Translation service unavailable'});}
};