import { chromium } from 'playwright';
const BASE='http://127.0.0.1:4174';
const ROUTES=['/busca','/voluntarios','/voluntarios/termo','/voluntarios/seja','/quero-adotar/xyz'];
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const page=await (await browser.newContext()).newPage();
for(const r of ROUTES){
  try{
    const resp=await page.goto(BASE+r,{waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForTimeout(1800);
    const body=await page.locator('body').innerText().catch(()=> '');
    const boom=body.includes('Algo deu errado');
    console.log(r, resp?.status(), boom?'💥 ErrorBoundary':'✅ ok', '|', body.replace(/\s+/g,' ').slice(0,80));
  }catch(e){console.log(r,'ERR',String(e.message).slice(0,80));}
}
await browser.close();
