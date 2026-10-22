/* Silver Lines Tackle Co. — store engine (vanilla JS, no dependencies)
   Cart persists in localStorage; prices are AUD incl. GST. */
(function(){
"use strict";
var S = window.SL_SETTINGS, P = window.SL_PRODUCTS;
var KEY="sl_cart_v1", BKEY="sl_buyer_v1", OKEY="sl_order_v1", PKEY="sl_prefs_v1";

/* ---------- helpers ---------- */
function $(s,c){return (c||document).querySelector(s);}
function $$(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));}
function money(n){return "$"+Number(n).toFixed(2);}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function read(k,f){try{var v=JSON.parse(localStorage.getItem(k));return v==null?f:v;}catch(e){return f;}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function product(id){for(var i=0;i<P.length;i++){if(P[i].id===id)return P[i];}return null;}
function qs(name){var m=new RegExp("[?&]"+name+"=([^&#]*)").exec(location.search);return m?decodeURIComponent(m[1].replace(/\+/g," ")):"";}

/* ---------- cart ---------- */
var Cart={
  items:read(KEY,[]),
  save:function(){write(KEY,this.items);this.paint();},
  add:function(id,qty){
    qty=qty||1;var p=product(id);if(!p)return;
    var line=null;
    for(var i=0;i<this.items.length;i++){if(this.items[i].id===id)line=this.items[i];}
    if(line){line.qty=Math.min(99,line.qty+qty);} else {this.items.push({id:id,qty:qty});}
    this.save();return p;
  },
  setQty:function(id,qty){
    qty=parseInt(qty,10);if(isNaN(qty))qty=1;
    if(qty<1){return this.remove(id);}
    for(var i=0;i<this.items.length;i++){if(this.items[i].id===id){this.items[i].qty=Math.min(99,qty);}}
    this.save();
  },
  remove:function(id){
    this.items=this.items.filter(function(l){return l.id!==id;});this.save();
  },
  clear:function(){this.items=[];this.save();},
  count:function(){var n=0;this.items.forEach(function(l){n+=l.qty;});return n;},
  detailed:function(){
    var out=[];
    this.items.forEach(function(l){var p=product(l.id);
      if(p)out.push({p:p,qty:l.qty,line:p.price*l.qty});});
    return out;
  },
  subtotal:function(){var t=0;this.detailed().forEach(function(l){t+=l.line;});return t;},
  paint:function(){
    var n=this.count();
    $$("[data-cart-count]").forEach(function(el){el.textContent=n;
      el.setAttribute("aria-label",n+" items in cart");});
    document.dispatchEvent(new CustomEvent("sl:cart",{detail:{count:n,subtotal:this.subtotal()}}));
  }
};

/* ---------- preferences: text size + contrast ---------- */
var Prefs={
  data:read(PKEY,{scale:"md",hc:false}),
  apply:function(){
    var h=document.documentElement;
    h.setAttribute("data-scale",this.data.scale==="md"?"md":this.data.scale);
    h.classList.toggle("hc",!!this.data.hc);
    $$("[data-scale-btn]").forEach(function(b){
      b.setAttribute("aria-pressed",String(b.getAttribute("data-scale-btn")===Prefs.data.scale));});
    var hb=$("[data-hc-btn]");if(hb)hb.setAttribute("aria-pressed",String(!!this.data.hc));
  },
  set:function(k,v){this.data[k]=v;write(PKEY,this.data);this.apply();}
};

/* ---------- order totals ---------- */
function shippingMethod(){
  var sel=$("#shippingMethod");
  return sel?sel.value:"standard";
}
function totals(){
  var sub=Cart.subtotal();
  var seniors=$("#seniorsToggle")?$("#seniorsToggle").checked:read("sl_seniors",false);
  var disc=seniors?sub*S.seniorsDiscount:0;
  var after=sub-disc;
  var m=shippingMethod(), ship=0, label="Standard delivery";
  if(m==="express"){ship=S.expressShipping;label="Express delivery";}
  else if(m==="pickup"){ship=0;label="Click & collect in store";}
  else{ship=(after>=S.freeShippingOver||after===0)?0:S.shippingFlat;}
  var grand=after+ship;
  return {sub:sub,disc:disc,after:after,ship:ship,shipLabel:label,grand:grand,seniors:seniors};
}

function renderTotals(host,opts){
  if(!host)return;
  opts=opts||{};var t=totals();
  var html="<dl>"+
    "<dt>Subtotal ("+Cart.count()+" item"+(Cart.count()===1?"":"s")+")</dt><dd>"+money(t.sub)+"</dd>";
  if(t.disc>0){html+="<dt>Seniors Card discount (10%)</dt><dd>&minus;"+money(t.disc)+"</dd>";}
  html+="<dt>"+esc(t.shipLabel)+"</dt><dd>"+(t.ship===0?(t.after>=S.freeShippingOver&&shippingMethod()==="standard"?"<span style='color:#1c7a4b'>FREE</span>":"$0.00"):money(t.ship))+"</dd>";
  html+="<dt>GST included</dt><dd>"+money(t.grand-(t.grand/(1+S.gstRate)))+"</dd>";
  html+="</dl><dl class='grand'><dt>Total to pay</dt><dd>"+money(t.grand)+"</dd></dl>";
  host.innerHTML=html;
  if(opts.pay){
    var b=$("#payAmount");if(b)b.textContent=money(t.grand);
    var row=$("#payRow");if(row)row.style.display="";
  }
}

/* ---------- shipping free-shipping banner ---------- */
function paintFreeNote(){
  var box=$("#freeNote");if(!box)return;
  var t=totals();
  if(Cart.count()===0){box.style.display="none";box.innerHTML="";return;}
  box.style.display="block";
  if(t.after>=S.freeShippingOver||shippingMethod()==="pickup"){
    box.textContent="Good news — your order qualifies for free standard delivery.";
  }else{
    box.textContent="Add "+money(S.freeShippingOver-t.after)+" more to unlock free standard delivery.";
  }
}

/* ---------- header: mobile menu, year, cart ---------- */
function initChrome(){
  var trunc=$("[data-year]");if(trunc)trunc.textContent=new Date().getFullYear();
  var mb=$("#menuBtn"),nav=$("#mainNav");
  if(mb&&nav){mb.addEventListener("click",function(){
    var open=nav.classList.toggle("open");
    mb.setAttribute("aria-expanded",String(open));});}
  $$("[data-scale-btn]").forEach(function(b){b.addEventListener("click",function(){
    Prefs.set("scale",b.getAttribute("data-scale-btn"));});});
  var hb=$("[data-hc-btn]");
  if(hb)hb.addEventListener("click",function(){Prefs.set("hc",!Prefs.data.hc);});
  Prefs.apply();
  var path=location.pathname.split("/").pop()||"index.html";
  $$("nav.main a").forEach(function(a){
    var href=a.getAttribute("href")||"";
    if(href===path||(path===""&&href==="index.html"))a.setAttribute("aria-current","page");});
  Cart.paint();
}

/* ---------- add-to-cart buttons (delegated) ---------- */
function initDelegates(){
  document.addEventListener("click",function(e){
    var b=e.target.closest?e.target.closest("[data-add]"):null;
    if(!b)return;
    e.preventDefault();
    var id=b.getAttribute("data-add");
    var qtyEl=$("#qty")||null;
    var qty=qtyEl?parseInt(qtyEl.value,10)||1:1;
    var p=Cart.add(id,qty);
    flash("Added “"+p.name+"” to your cart.");
    if(b.getAttribute("data-go")==="cart"){location.href="cart.html";}
  });
}
function flash(msg){
  var host=$("#flash");if(!host)return;
  host.textContent=msg;host.className="alert ok";host.style.display="block";
  clearTimeout(flash._t);flash._t=setTimeout(function(){host.style.display="none";},4200);
}

/* ---------- SHOP page ---------- */
function initShop(){
  var grid=$("#shopGrid");if(!grid)return;
  var state={cat:"all",sort:"featured",q:""};
  var catSel=$("#catFilter"),sortSel=$("#sortFilter"),search=$("#searchBox");

  function card(p){
    var img="assets/img/thumb-"+p.id+".jpg";
    var save=p.was&&p.was>p.price?"<span class='was'>"+money(p.was)+"</span>":"";
    return "<article class='card'>"+
      "<a href='product.html?id="+p.id+"' aria-label='View "+esc(p.name)+"'>"+
      "<img src='"+img+"' width='560' height='560' loading='lazy' alt='"+esc(p.name)+"'></a>"+
      "<div class='card-pad'>"+
      (p.badge?"<span class='badge"+(p.was?" save":"")+"'>"+esc(p.badge)+"</span>":"")+
      "<h3><a href='product.html?id="+p.id+"' style='text-decoration:none;color:inherit'>"+esc(p.name)+"</a></h3>"+
      "<p class='stars' aria-label='Rated "+p.rating+" out of 5'>"+"&#9733;".repeat(Math.round(p.rating))+" <span style='color:#4c5f6b'>"+p.rating+" ("+p.reviews+")</span></p>"+
      "<p>"+esc(p.short)+"</p>"+
      "<p class='price'>"+money(p.price)+save+"<small>GST included</small></p>"+
      "<div class='card-actions'>"+
      "<button class='btn btn-primary btn-sm' data-add='"+p.id+"'>Add to cart</button>"+
      "<a class='btn btn-ghost btn-sm' href='product.html?id="+p.id+"'>Details</a>"+
      "</div></div></article>";
  }
  function draw(){
    var list=P.slice();
    if(state.cat!=="all")list=list.filter(function(p){return p.cat===state.cat;});
    if(state.q){var q=state.q.toLowerCase();
      list=list.filter(function(p){return (p.name+" "+p.short+" "+p.blurb).toLowerCase().indexOf(q)>-1;});}
    if(state.sort==="low")list.sort(function(a,b){return a.price-b.price;});
    else if(state.sort==="high")list.sort(function(a,b){return b.price-a.price;});
    else if(state.sort==="name")list.sort(function(a,b){return a.name.localeCompare(b.name);});
    else if(state.sort==="rating")list.sort(function(a,b){return b.rating-a.rating;});
    grid.innerHTML=list.length?list.map(card).join(""):
      "<div class='alert info'>No products match that search. Try clearing the filters.</div>";
    var res=$("#resultCount");
    if(res)res.textContent=list.length+" product"+(list.length===1?"":"s")+" shown";
  }
  if(catSel)catSel.addEventListener("change",function(){state.cat=catSel.value;draw();});
  if(sortSel)sortSel.addEventListener("change",function(){state.sort=sortSel.value;draw();});
  if(search)search.addEventListener("input",function(){state.q=search.value.trim();draw();});
  draw();
}

/* ---------- PRODUCT page ---------- */
function initProduct(){
  var host=$("#productDetail");if(!host)return;
  var p=product(qs("id"))||P[0];
  document.title=p.name+" | "+S.brand;
  var rows=p.specs.map(function(r){return "<tr><th scope='row'>"+esc(r[0])+"</th><td>"+esc(r[1])+"</td></tr>";}).join("");
  var save=p.was&&p.was>p.price?"<span class='was'>"+money(p.was)+"</span>":"";
  host.innerHTML="<div class='pd-img'><img src='assets/img/"+p.id+".jpg' width='1200' height='1200' alt='"+esc(p.name)+"'></div>"+
   "<div>"+(p.badge?"<span class='badge"+(p.was?" save":"")+"'>"+esc(p.badge)+"</span>":"")+
   "<h1>"+esc(p.name)+"</h1>"+
   "<p class='stars' aria-label='Rated "+p.rating+" out of 5'>"+"&#9733;".repeat(Math.round(p.rating))+" <span style='color:#4c5f6b'>"+p.rating+" from "+p.reviews+" reviews</span></p>"+
   "<p class='price' style='font-size:2rem'>"+money(p.price)+save+"<small>GST included &middot; "+p.stock+" in stock</small></p>"+
   "<p>"+esc(p.blurb)+"</p>"+
   "<div class='btn-row'>"+
   "<label for='qty' style='align-self:center;margin:0'>Qty</label>"+
   "<input id='qty' type='number' min='1' max='99' value='1' style='width:96px'>"+
   "<button class='btn btn-primary' data-add='"+p.id+"' data-go='cart'>Add to cart</button>"+
   "<a class='btn btn-ghost' href='shop.html'>Back to shop</a></div>"+
   "<div class='alert info'><strong>Delivery:</strong> free standard shipping on orders over "+money(S.freeShippingOver)+
   ". Express "+money(S.expressShipping)+", or free click &amp; collect from our Yamba store.</div></div>";
  var spec=$("#specTable");
  if(spec){spec.innerHTML="<h2>Specifications</h2><table class='spec'><tbody>"+rows+"</tbody></table>"+
    "<h3>What is in the box</h3><p>"+esc(p.includes)+"</p>"+
    "<h3>Care instructions</h3><p>"+esc(p.care)+"</p>";}
  var rel=$("#relatedGrid");
  if(rel){var others=P.filter(function(x){return x.id!==p.id;}).slice(0,3);
    rel.innerHTML=others.map(function(o){
      return "<article class='card'><a href='product.html?id="+o.id+"'><img src='assets/img/thumb-"+o.id+
      ".jpg' width='560' height='560' loading='lazy' alt='"+esc(o.name)+"'></a><div class='card-pad'><h3><a href='product.html?id="+
      o.id+"' style='text-decoration:none;color:inherit'>"+esc(o.name)+"</a></h3><p class='price' style='font-size:1.25rem'>"+
      money(o.price)+"</p><div class='card-actions'><button class='btn btn-primary btn-sm' data-add='"+o.id+"'>Add to cart</button></div></div></article>";}).join("");}
}

/* ---------- CART page ---------- */
function initCart(){
  var host=$("#cartLines");if(!host)return;
  var sen=$("#seniorsToggle"),ship=$("#shippingMethod");
  if(sen){sen.checked=read("sl_seniors",false);sen.addEventListener("change",function(){
    write("sl_seniors",sen.checked);draw();});}
  if(ship){ship.addEventListener("change",draw);}

  function line(l){
    return "<div class='cart-line'>"+
      "<img src='assets/img/thumb-"+l.p.id+".jpg' width='110' height='110' alt='"+esc(l.p.name)+"'>"+
      "<div><h3 style='margin-bottom:.2em;font-size:1.08em'>"+esc(l.p.name)+"</h3>"+
      "<p class='path' style='margin-bottom:.6em'>"+money(l.p.price)+" each &middot; GST included</p>"+
      "<div class='qty'><button type='button' data-dec='"+l.p.id+"' aria-label='Reduce quantity of "+esc(l.p.name)+"'>&minus;</button>"+
      "<span aria-live='polite'>"+l.qty+"</span>"+
      "<button type='button' data-inc='"+l.p.id+"' aria-label='Increase quantity of "+esc(l.p.name)+"'>+</button></div></div>"+
      "<div class='line-total' style='text-align:right'><p class='price' style='font-size:1.25rem'>"+money(l.line)+"</p>"+
      "<button class='btn-tiny' style='border-color:#b3261e;color:#b3261e' type='button' data-del='"+l.p.id+"'>Remove</button></div></div>";
  }
  function draw(){
    var list=Cart.detailed();
    if(!list.length){
      host.innerHTML="<div class='alert info'><strong>Your cart is empty.</strong><br>Browse the shop to add senior-friendly gear.</div>";
      var wrap=$("#checkoutCol");if(wrap)wrap.style.display="none";
      renderTotals($("#cartTotals"));paintFreeNote();return;
    }
    host.innerHTML=list.map(line).join("");
    var wrap=$("#checkoutCol");if(wrap)wrap.style.display="";
    renderTotals($("#cartTotals"),{pay:false});
    var go=$("#toCheckout");if(go)go.textContent="Proceed to checkout ("+money(totals().grand)+")";
    paintFreeNote();
  }
  host.addEventListener("click",function(e){
    var b=e.target.closest?e.target.closest("[data-inc],[data-dec],[data-del]"):null;if(!b)return;
    if(b.hasAttribute("data-inc")){var id=b.getAttribute("data-inc");
      for(var i=0;i<Cart.items.length;i++){if(Cart.items[i].id===id)Cart.setQty(id,Cart.items[i].qty+1);}}
    else if(b.hasAttribute("data-dec")){var id2=b.getAttribute("data-dec");
      for(var j=0;j<Cart.items.length;j++){if(Cart.items[j].id===id2)Cart.setQty(id2,Cart.items[j].qty-1);}}
    else{Cart.remove(b.getAttribute("data-del"));}
    draw();
  });
  draw();
}

/* ---------- CHECKOUT ---------- */
var STATES=["NSW","VIC","QLD","SA","WA","TAS","NT","ACT"];
function setErr(id,msg){
  var f=document.getElementById(id+"Err");
  if(!f)return;
  if(msg){f.textContent=msg;f.style.display="block";}else{f.style.display="none";}
}
function validCard(num){
  var s=num.replace(/\D/g,"");if(s.length<13||s.length>19)return false;
  var sum=0,alt=false;
  for(var i=s.length-1;i>=0;i--){var d=parseInt(s.charAt(i),10);
    if(alt){d*=2;if(d>9)d-=9;}sum+=d;alt=!alt;}
  return sum%10===0;
}
function initCheckout(){
  var form=$("#checkoutForm");if(!form)return;
  var b=read(BKEY,{});
  ["firstName","lastName","email","phone","street","suburb","state","postcode","notes"].forEach(function(k){
    var el=document.getElementById(k);if(el&&b[k])el.value=b[k];});
  var sen=$("#seniorsToggle"),ship=$("#shippingMethod");
  if(sen){sen.checked=read("sl_seniors",false);sen.addEventListener("change",function(){
    write("sl_seniors",sen.checked);renderTotals($("#checkoutTotals"),{pay:true});paintFreeNote();});}
  if(ship){ship.addEventListener("change",function(){renderTotals($("#checkoutTotals"),{pay:true});paintFreeNote();});}
  renderTotals($("#checkoutTotals"),{pay:true});paintFreeNote();

  var pay=$("#payNow");
  if(pay)pay.addEventListener("click",function(){
    if(!submitOrder())return;
  });
}
function submitOrder(){
  var errs=[],form=$("#checkoutForm");
  function val(id){var el=document.getElementById(id);return el?el.value.trim():"";}
  ["firstName","lastName","street","suburb","state","postcode","email","phone"].forEach(function(id){setErr(id,"");});
  if(!val("firstName"))errs.push(["firstName","Please enter your first name."]);
  if(!val("lastName"))errs.push(["lastName","Please enter your last name."]);
  if(!val("street"))errs.push(["street","Please enter your street address."]);
  if(!val("suburb"))errs.push(["suburb","Please enter your suburb."]);
  var st=val("state");
  if(!st||STATES.indexOf(st)<0)errs.push(["state","Please choose your state or territory."]);
  var pc=val("postcode");
  if(!/^\d{4}$/.test(pc))errs.push(["postcode","Australian postcodes are 4 digits."]);
  var em=val("email");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em))errs.push(["email","Please enter a valid email address."]);
  var ph=val("phone").replace(/[^\d]/g,"");
  if(ph.length<8)errs.push(["phone","Please enter a contact phone number."]);
  if(!Cart.count())errs.push(["trig","Your cart is empty."]);

  var method=$("input[name='payment']:checked");
  method=method?method.value:"card";
  if(method==="card"){
    ["cardName","cardNumber","cardExpiry","cardCvc"].forEach(function(id){setErr(id,"");});
    if(!val("cardName"))errs.push(["cardName","Please enter the name printed on the card."]);
    if(!validCard(val("cardNumber")))errs.push(["cardNumber","That card number does not look right. Please check it."]);
    var ex=val("cardExpiry");
    if(!/^(0[1-9]|1[0-2])\/\d{2}$/.test(ex)){errs.push(["cardExpiry","Use the MM/YY format."]);}
    else{var mm=parseInt(ex.split("/")[0],10),yy=parseInt(ex.split("/")[1],10)+2000;
      var now=new Date(),ey=now.getFullYear(),em2=now.getMonth()+1;
      if(yy<ey||(yy===ey&&mm<em2))errs.push(["cardExpiry","That card has expired."]);}
    if(!/^\d{3,4}$/.test(val("cardCvc")))errs.push(["cardCvc","The security code is 3 or 4 digits."]);
  }
  if(!$("#agreeTerms")||!$("#agreeTerms").checked)errs.push(["agreeTerms","Please accept the Terms of Sale and Returns Policy."]);
  if(!$("#agreeAge")||!$("#agreeAge").checked)errs.push(["agreeAge","Please confirm you are 18 or over (a legal requirement for some fishing gear)."]);

  var host=$("trigErr")||document.getElementById("trigErr");
  if(host){host.style.display="none";}
  if(errs.length){
    var map={};errs.forEach(function(e){if(!map[e[0]])map[e[0]]=[];map[e[0]].push(e[1]);});
    Object.keys(map).forEach(function(k){setErr(k,map[k].join(" "));});
    var top=document.getElementById(errs[0][0]);
    if(top&&top.focus)top.focus();
    if(top&&top.scrollIntoView)top.scrollIntoView({block:"center"});
    return false;
  }
  /* save buyer details for next time */
  write(BKEY,{firstName:val("firstName"),lastName:val("lastName"),email:val("email"),phone:val("phone"),
    street:val("street"),suburb:val("suburb"),state:val("state"),postcode:val("postcode"),notes:val("notes")});

  var t=totals();
  var order={
    id:"SL-"+String(new Date().getFullYear()).slice(2)+Math.floor(10000+Math.random()*89999),
    placed:new Date().toISOString(),
    email:val("email"),name:val("firstName")+" "+val("lastName"),
    phone:val("phone"),
    address:val("street")+", "+val("suburb")+" "+val("state")+" "+val("postcode"),
    notes:val("notes"),
    method:method,
    shipping:shippingMethod(),
    shippingLabel:t.shipLabel,
    eta:shippingMethod()==="express"?"1–2 business days":(shippingMethod()==="pickup"?"Ready next business day":"3–6 business days"),
    items:Cart.detailed().map(function(l){return {name:l.p.name,qty:l.qty,price:l.p.price,line:l.line};}),
    sub:t.sub,disc:t.disc,ship:t.ship,gst:t.grand-(t.grand/(1+S.gstRate)),total:t.grand,
    last4:method==="card"?val("cardNumber").replace(/\D/g,"").slice(-4):null
  };
  write(OKEY,order);

  /* Payment layer: live Stripe Checkout when configured, otherwise manual/offline mode. */
  var btn=$("#payNow"),status=$("#payStatus");
  if(btn){btn.disabled=true;btn.textContent="Processing payment…";}
  if(status)status.style.display="block";

  if(S.stripe.publishableKey&&S.stripe.checkoutEndpoint){
    try{
      fetch(S.stripe.checkoutEndpoint,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({items:order.items,email:order.email,total:order.total,orderId:order.id,
          successUrl:location.origin+location.pathname.replace(/[^/]*$/,"")+"payment-success.html",
          cancelUrl:location.origin+location.pathname.replace(/[^/]*$/,"")+"checkout.html"})})
      .then(function(r){return r.json();})
      .then(function(d){ if(d&&d.url){location.href=d.url;} else{finish(order);} })
      .catch(function(){finish(order);});
      return false;
    }catch(e){}
  }
  setTimeout(function(){finish(order);},1400);
  return false;
}
function finish(order){
  Cart.clear();
  location.href="payment-success.html?order="+encodeURIComponent(order.id);
}

/* ---------- PAYMENT SUCCESS ---------- */
function initSuccess(){
  var host=$("#receipt");if(!host)return;
  var o=read(OKEY,null);
  if(!o){
    host.innerHTML="<div class='alert info'>We could not find an order in this browser. If you have just paid, "+
      "your confirmation email is on its way. Contact us on "+S.phone+" if you need a copy of your receipt.</div>";
    return;
  }
  var rows=o.items.map(function(i){
    return "<tr><td>"+esc(i.name)+"<br><span class='path'>Quantity "+i.qty+"</span></td><td>"+money(i.line)+"</td></tr>";}).join("");
  host.innerHTML=
   "<p><strong>Order number:</strong> "+esc(o.id)+"<br>"+
   "<strong>Placed:</strong> "+new Date(o.placed).toLocaleString("en-AU")+"<br>"+
   "<strong>Receipt sent to:</strong> "+esc(o.email)+"</p>"+
   "<table><thead><tr><th>Item</th><th>Amount</th></tr></thead><tbody>"+rows+"</tbody></table>"+
   "<div style='margin-top:18px'><dl style='display:flex;justify-content:space-between'><dt>Subtotal</dt><dd>"+money(o.sub)+"</dd></dl>"+
   (o.disc>0?"<dl style='display:flex;justify-content:space-between'><dt>Seniors Card discount</dt><dd>&minus;"+money(o.disc)+"</dd></dl>":"")+
   "<dl style='display:flex;justify-content:space-between'><dt>"+esc(o.shippingLabel)+" ("+esc(o.eta)+")</dt><dd>"+(o.ship===0?"FREE":money(o.ship))+"</dd></dl>"+
   "<dl style='display:flex;justify-content:space-between'><dt>GST included</dt><dd>"+money(o.gst)+"</dd></dl>"+
   "<dl style='display:flex;justify-content:space-between;border-top:2px solid #dfe4e2;padding-top:12px;font-size:1.2em'><dt><strong>Total paid</strong></dt><dd><strong>"+money(o.total)+"</strong></dd></dl></div>"+
   "<p class='path' style='margin-top:16px'>Paid by "+(o.method==="card"?("card ending "+esc(o.last4)):(o.method==="paypal"?"PayPal":"bank transfer"))+
   ". GST included in all amounts. "+S.brand+", ABN "+S.ABN+"</p>"+
   "<p style='margin-bottom:0'><strong>Delivery to:</strong><br>"+esc(o.name)+"<br>"+esc(o.address)+"<br>"+esc(o.phone)+"</p>";
  var oc=$("#orderNo");if(oc)oc.textContent=o.id;
  var od=$("#orderEmail");if(od)od.textContent=o.email;
  var oe=$("#orderEta");if(oe)oe.textContent=o.eta;
  var pd=$("#printBtn");if(pd)pd.addEventListener("click",function(){window.print();});
}

/* ---------- CONTACT ---------- */
function initContact(){
  var f=$("#contactForm");if(!f)return;
  f.addEventListener("submit",function(e){
    e.preventDefault();
    var name=$("#cName").value.trim(),mail=$("#cEmail").value.trim(),msg=$("#cMessage").value.trim();
    if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)||msg.length<10){
      var a=$("#contactAlert");a.className="alert err";
      a.textContent="Please add your name, a valid email address and a message of at least 10 characters.";
      a.style.display="block";return;}
    /* Wire this to your form handler (Formspree, Netlify Forms or your own endpoint). */
    var a=$("#contactAlert");a.className="alert ok";
    a.innerHTML="<strong>Thank you, "+esc(name)+".</strong> Your message has been recorded. We reply to every enquiry within one business day. For anything urgent please call "+S.phone+".";
    a.style.display="block";f.reset();
  });
}

/* ---------- GUIDES ---------- */
function initGuides(){
  var host=$("#guideList");if(!host)return;
  var G=window.SL_GUIDES;
  var slug=qs("guide");
  if(slug){
    var g=null;G.forEach(function(x){if(x.slug===slug)g=x;});
    if(g){
      document.title=g.title+" | "+S.brand;
      host.innerHTML="<p><a href='guides.html'>&larr; All guides</a></p><h1>"+esc(g.title)+"</h1>"+
        "<p class='path'>"+esc(g.level)+" &middot; "+esc(g.read)+" read</p>"+
        "<p class='lead'>"+esc(g.intro)+"</p>"+
        (g.sections||[]).map(function(s,i){
          return "<h2 id='s"+i+"'>"+esc(s[0])+"</h2><p>"+esc(s[1])+"</p>";}).join("")+
        "<div class='alert ok'><strong>In short:</strong> "+esc(g.takeaway)+"</div>"+
        "<div class='btn-row'><a class='btn btn-primary' href='shop.html'>Shop senior-friendly gear</a>"+
        "<a class='btn btn-ghost' href='guides.html'>Read another guide</a></div>";
      return;
    }
  }
  host.innerHTML=G.map(function(g){
    return "<article class='card'><a href='guides.html?guide="+g.slug+"'><img src='assets/img/"+(g.img||"guides-hero.jpg")+
    "' width='1920' height='1080' loading='lazy' alt=''></a><div class='card-pad'>"+
    "<span class='badge'>"+esc(g.level)+"</span><h3><a href='guides.html?guide="+g.slug+
    "' style='text-decoration:none;color:inherit'>"+esc(g.title)+"</a></h3><p>"+esc(g.intro)+"</p>"+
    "<p class='path'>"+esc(g.read)+" read</p><div class='card-actions'>"+
    "<a class='btn btn-dark btn-sm' href='guides.html?guide="+g.slug+"'>Read the guide</a></div></div></article>";}).join("");
}

/* ---------- boot ---------- */
document.addEventListener("DOMContentLoaded",function(){
  initChrome();initDelegates();
  var page=document.body.getAttribute("data-page");
  if(page==="shop")initShop();
  if(page==="product")initProduct();
  if(page==="cart")initCart();
  if(page==="checkout")initCheckout();
  if(page==="success")initSuccess();
  if(page==="contact")initContact();
  if(page==="guides")initGuides();
  Cart.paint();
});
})();
