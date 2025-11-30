
let cart=[];

function renderProducts(){
 let box=document.getElementById("product-list");
 box.innerHTML="";
 products.forEach(p=>{
   box.innerHTML+=`
   <div class='product'>
     <img src='${p.img}'>
     <h3>${p.name}</h3>
     <p>${p.price} so‘m</p>
     <button onclick="addToCart('${p.name}',${p.price})">Savatga qo‘shish</button>
   </div>`;
 });
}

function addToCart(name,price){
 cart.push({name,price});
 document.getElementById('cart-count').innerText=cart.length;
}

function openCart(){
 document.getElementById('cart-modal').style.display='block';
 let box=document.getElementById('cart-items');
 box.innerHTML='';
 let total=0;
 cart.forEach(i=>{
   total+=i.price;
   box.innerHTML+=`<li>${i.name} - ${i.price} so‘m</li>`;
 });
 document.getElementById('total-price').innerText=total;
}

function closeCart(){
 document.getElementById('cart-modal').style.display='none';
}

function sendToTelegram(){
 let msg='🛍 Buyurtma:%0A';
 cart.forEach(i=> msg+=`${i.name} - ${i.price} so‘m%0A`);
 let total=cart.reduce((a,b)=>a+b.price,0);
 msg+=`Umumiy: ${total} so‘m`;
 window.open(`https://t.me/onatili_premium?text=${msg}`);
}

function toggleDarkMode(){
 document.body.classList.toggle('dark');
}

renderProducts();
