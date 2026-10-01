const fs=require('fs');
const path=require('path');
const files=[
  'components/InvoiceList.tsx',
  'components/Inventory.tsx',
  'components/Customers.tsx',
  'components/Expenses.tsx',
  'components/Reports.tsx',
  'components/CierreCaja.tsx',
  'components/Settings.tsx',
  'components/UserManagement.tsx',
  'components/Login.tsx',
  'components/LandingDashboard.tsx',
  'components/OrganizationSetup.tsx',
  'components/InventoryCount.tsx',
  'components/InvoiceForm.tsx',
  'components/ReceiptForm.tsx',
  'components/GlobalSearch.tsx',
  'components/Expenses.tsx',
  'components/Reports.tsx',
  'components/CierreCaja.tsx',
];

const replacements=[
  // Order matters: more specific first
  [/\bbg-white(?!\s+dark:)/g, 'bg-white dark:bg-gray-900'],
  [/\bbg-gray-50(?!\s+dark:)/g, 'bg-gray-50 dark:bg-gray-800'],
  [/\bbg-gray-100(?!\s+dark:)/g, 'bg-gray-100 dark:bg-gray-800'],
  // For bg-[#f5f5f7] already handled in Layout, skip
  [/\btext-gray-900(?!\s+dark:)/g, 'text-gray-900 dark:text-white'],
  [/\btext-gray-800(?!\s+dark:)/g, 'text-gray-800 dark:text-gray-200'],
  [/\btext-gray-700(?!\s+dark:)/g, 'text-gray-700 dark:text-gray-300'],
  [/\btext-gray-600(?!\s+dark:)/g, 'text-gray-600 dark:text-gray-400'],
  // Keep text-gray-500 with dark variant but not duplicate if already has dark
  // We'll handle text-gray-500 separately but avoid double
  [/\btext-gray-500(?!\s+dark:)/g, 'text-gray-500 dark:text-gray-400'],
  [/\btext-gray-400(?!\s+dark:)/g, 'text-gray-400 dark:text-gray-500'],
  [/\bborder-gray-200(?!\s+dark:)/g, 'border-gray-200 dark:border-gray-700'],
  [/\bborder-gray-100(?!\s+dark:)/g, 'border-gray-100 dark:border-gray-800'],
  [/\bdivide-gray-100(?!\s+dark:)/g, 'divide-gray-100 dark:divide-gray-800'],
  [/\bdivide-gray-50(?!\s+dark:)/g, 'divide-gray-50 dark:divide-gray-800'],
  [/\bhover:bg-gray-50(?!\s+dark:)/g, 'hover:bg-gray-50 dark:hover:bg-gray-800'],
  [/\bhover:bg-gray-100(?!\s+dark:)/g, 'hover:bg-gray-100 dark:hover:bg-gray-800'],
  [/\bbg-black(?!\s+dark:)/g, 'bg-black dark:bg-white'],
  [/\btext-white(?!\s+dark:)/g, 'text-white dark:text-black'],
  // For buttons that are bg-black text-white, need to handle together
  // We'll handle specific button patterns after
];

function hasDarkVariant(str, idx, match){
  // check if after match there's already dark:
  const after = str.slice(idx+match.length, idx+match.length+20);
  return after.includes('dark:');
}

for(const file of files){
  const full=path.join(__dirname,file);
  if(!fs.existsSync(full)) { console.log('skip missing',file); continue; }
  let content=fs.readFileSync(full,'utf8');
  let original=content;
  // Skip InvoicePrint and ReceiptPrint - not in list
  // Apply replacements
  for(const [regex,repl] of replacements){
    // Use function to avoid double adding if already has dark
    content=content.replace(regex, (match, offset, str) => {
      // Check if already followed by dark variant
      // For simple regex we already use negative lookahead, so safe
      return repl;
    });
  }
  // Special handling for bg-black text-white buttons: need to handle text-white dark:text-black already done, but bg-black dark:bg-white already done
  // For hover:bg-gray-800 on black buttons, add dark:hover:bg-gray-200
  content=content.replace(/hover:bg-gray-800(?!.*dark:hover:)/g, 'hover:bg-gray-800 dark:hover:bg-gray-200');
  // For border-black add dark:border-white
  content=content.replace(/border-black(?!.*dark:)/g, 'border-black dark:border-white');
  // For shadow
  // For bg-gray-900 already dark, skip

  // Fix duplicate dark variants like bg-white dark:bg-gray-900 dark:bg-gray-900
  content=content.replace(/dark:bg-gray-900\s+dark:bg-gray-900/g, 'dark:bg-gray-900');
  content=content.replace(/dark:text-white\s+dark:text-white/g, 'dark:text-white');
  content=content.replace(/dark:border-gray-700\s+dark:border-gray-700/g, 'dark:border-gray-700');
  content=content.replace(/dark:bg-gray-800\s+dark:bg-gray-800/g, 'dark:bg-gray-800');

  if(content!==original){
    fs.writeFileSync(full,content,'utf8');
    console.log('updated',file);
  } else {
    console.log('no change',file);
  }
}
console.log('done');
