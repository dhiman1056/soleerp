const m=(t,r=2)=>{const n=parseFloat(t)||0;return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:r,maximumFractionDigits:r}).format(n)};export{m as f};
