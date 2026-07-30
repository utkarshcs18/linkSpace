document.addEventListener('DOMContentLoaded', () => {

    const btnStamp = document.getElementById('btn-stamp');
  const msgStamp = document.getElementById('msg-stamp');
  const stampGraphic = document.getElementById('stamp-graphic');

  function triggerStamp() {
      stampGraphic.classList.remove('stamped');
      msgStamp.classList.remove('thud');
      
      void stampGraphic.offsetWidth;

      stampGraphic.classList.add('stamped');
      
      setTimeout(() => {
          msgStamp.classList.add('thud');
          setTimeout(() => {
              msgStamp.classList.remove('thud');
          }, 50); 
      }, 120);
  }

  if (btnStamp) {
      btnStamp.addEventListener('click', triggerStamp);
      setTimeout(triggerStamp, 500);
  }

  const btnDecrypt = document.getElementById('btn-decrypt');
  const redactedLines = document.querySelectorAll('.redacted-line');

  function triggerDecrypt() {
      redactedLines.forEach(line => line.classList.remove('revealed'));
      
      let delay = 0;
      redactedLines.forEach((line, index) => {
          setTimeout(() => {
              line.classList.add('revealed');
          }, delay);
          delay += 150 + Math.random() * 100;
      });
  }

  if (btnDecrypt) {
      btnDecrypt.addEventListener('click', triggerDecrypt);
      setTimeout(triggerDecrypt, 1000);
  }

    const slabBtn = document.getElementById('slab-btn');
  if (slabBtn) {
      slabBtn.addEventListener('click', () => {
          console.log("Slab pressed!");
      });
  }

  const scanCard = document.getElementById('scan-card');
  
  function triggerScan() {
      scanCard.classList.remove('scanning');
      void scanCard.offsetWidth; 
      scanCard.classList.add('scanning');
  }

  if (scanCard) {
      scanCard.addEventListener('mouseenter', () => {
          if(!scanCard.classList.contains('scanning')) {
              triggerScan();
          }
      });
      scanCard.addEventListener('animationend', () => {
          scanCard.classList.remove('scanning');
      });
      setTimeout(triggerScan, 800);
  }

  const btnVerify = document.getElementById('btn-verify');
  const verifyCode = document.getElementById('verify-code');
  const originalCode = "4F2A 9B1C 88DE";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

  function triggerVerify() {
      verifyCode.classList.remove('verified');
      let iterations = 0;
      const maxIterations = 20; 
      
      const interval = setInterval(() => {
          verifyCode.innerText = originalCode.split('').map(char => {
              if (char === ' ') return ' ';
              return chars[Math.floor(Math.random() * chars.length)];
          }).join('');
          
          const xOffset = Math.random() * 4 - 2;
          const yOffset = Math.random() * 4 - 2;
          verifyCode.style.transform = `translate(${xOffset}px, ${yOffset}px)`;

          iterations++;
          if (iterations >= maxIterations) {
              clearInterval(interval);
              verifyCode.innerText = originalCode;
              verifyCode.style.transform = 'none';
              verifyCode.classList.add('verified');
          }
      }, 20);
  }

  if (btnVerify) {
      btnVerify.addEventListener('click', triggerVerify);
  }

  const btnSnap = document.getElementById('btn-snap');
  const views = document.querySelectorAll('.snap-view');
  let currentView = 0;

  function triggerSnap() {
      views[currentView].classList.remove('active');
      currentView = (currentView + 1) % views.length;
      views[currentView].classList.add('active');
  }

  if (btnSnap) {
      btnSnap.addEventListener('click', triggerSnap);
  }

  const btnType = document.getElementById('btn-type');
  const typeContainer = document.getElementById('typewriter-text');
  const typeCursor = document.getElementById('typewriter-cursor');
  const typeText = "INITIALIZING SECURE PROTOCOL...\nESTABLISHING E2E CONNECTION...\nHANDSHAKE COMPLETE.";

  function triggerTypewriter() {
      typeContainer.innerText = '';
      typeCursor.classList.remove('blink');
      
      let i = 0;
      
      function typeChar() {
          if (i < typeText.length) {
              typeContainer.innerText += typeText.charAt(i);
              i++;
              
              const jitter = Math.random() * 2 - 1;
              typeContainer.parentElement.style.transform = `translateY(${jitter}px)`;
              
              setTimeout(() => {
                  typeContainer.parentElement.style.transform = 'none';
              }, 20);

              setTimeout(typeChar, 30 + Math.random() * 50);
          } else {
              typeCursor.classList.add('blink');
          }
      }
      
      typeChar();
  }

  if (btnType) {
      btnType.addEventListener('click', triggerTypewriter);
      setTimeout(triggerTypewriter, 1200);
  }

});
