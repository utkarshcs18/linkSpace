document.addEventListener('DOMContentLoaded', () => {

  /* === Effect 1: Rubber Stamp === */
  const btnStamp = document.getElementById('btn-stamp');
  const msgStamp = document.getElementById('msg-stamp');
  const stampGraphic = document.getElementById('stamp-graphic');

  function triggerStamp() {
      // Reset
      stampGraphic.classList.remove('stamped');
      msgStamp.classList.remove('thud');
      
      // Force reflow
      void stampGraphic.offsetWidth;

      // Trigger
      stampGraphic.classList.add('stamped');
      
      // Thud effect on impact (~150ms after animation start)
      setTimeout(() => {
          msgStamp.classList.add('thud');
          setTimeout(() => {
              msgStamp.classList.remove('thud');
          }, 50); // fast recovery
      }, 120);
  }

  if (btnStamp) {
      btnStamp.addEventListener('click', triggerStamp);
      // Auto trigger on load
      setTimeout(triggerStamp, 500);
  }

  /* === Effect 2: Redacted Reveal === */
  const btnDecrypt = document.getElementById('btn-decrypt');
  const redactedLines = document.querySelectorAll('.redacted-line');

  function triggerDecrypt() {
      redactedLines.forEach(line => line.classList.remove('revealed'));
      
      let delay = 0;
      redactedLines.forEach((line, index) => {
          setTimeout(() => {
              line.classList.add('revealed');
          }, delay);
          // Stagger delays
          delay += 150 + Math.random() * 100;
      });
  }

  if (btnDecrypt) {
      btnDecrypt.addEventListener('click', triggerDecrypt);
      setTimeout(triggerDecrypt, 1000);
  }

  /* === Effect 3: Slab Press === */
  // Purely CSS driven using :active, no JS needed for the core effect.
  // We just add a log to show it works manually.
  const slabBtn = document.getElementById('slab-btn');
  if (slabBtn) {
      slabBtn.addEventListener('click', () => {
          console.log("Slab pressed!");
      });
  }

  /* === Effect 4: Scanline Sweep === */
  const scanCard = document.getElementById('scan-card');
  
  function triggerScan() {
      scanCard.classList.remove('scanning');
      void scanCard.offsetWidth; // Reflow
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
      // Auto trigger on load
      setTimeout(triggerScan, 800);
  }

  /* === Effect 5: Glitch Verify === */
  const btnVerify = document.getElementById('btn-verify');
  const verifyCode = document.getElementById('verify-code');
  const originalCode = "4F2A 9B1C 88DE";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

  function triggerVerify() {
      verifyCode.classList.remove('verified');
      let iterations = 0;
      const maxIterations = 20; // ~400ms at 20ms interval
      
      const interval = setInterval(() => {
          verifyCode.innerText = originalCode.split('').map(char => {
              if (char === ' ') return ' ';
              return chars[Math.floor(Math.random() * chars.length)];
          }).join('');
          
          // Random slight offset for mechanical glitch feel
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

  /* === Effect 6: Hard Snap === */
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

  /* === Effect 7: Typewriter Thud === */
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
              
              // Mechanical jitter per char
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

  /* === Effect 8: Grid Shift === */
  // Purely CSS driven using :hover, no JS required.
});
