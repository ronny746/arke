const fs = require('fs');

function fixHeader(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace the double title
  content = content.replace(
    /<div className="font-bold text-xl text-gray-900 truncate pr-4">\{session\.title \|\| 'DPP Session'\} \(Admin Analysis\)<\/div>\s*<div className="font-bold text-xl text-gray-900 truncate pr-4">\{session\.title \|\| 'DPP Session'\}<\/div>/g,
    `<div className="font-bold text-lg md:text-xl text-gray-900 truncate flex-1 min-w-0 pr-4">{session.title || 'DPP Session'}</div>`
  );
  
  content = content.replace(
    /<div className="font-bold text-xl text-gray-900 truncate pr-4">\{session\.title \|\| 'DPP Session'\} \(Teacher Analysis\)<\/div>\s*<div className="font-bold text-xl text-gray-900 truncate pr-4">\{session\.title \|\| 'DPP Session'\}<\/div>/g,
    `<div className="font-bold text-lg md:text-xl text-gray-900 truncate flex-1 min-w-0 pr-4">{session.title || 'DPP Session'}</div>`
  );

  content = content.replace(
    /\{session\.title \|\| 'DPP Session'\} \(Admin Analysis\)/g,
    `{session.title || 'DPP Session'}`
  );

  // Shrink the flex gap for the metrics area
  content = content.replace(
    /<div className="flex items-center gap-6">/g,
    `<div className="flex items-center gap-3 md:gap-6 shrink-0">`
  );
  
  fs.writeFileSync(file, content);
}

fixHeader('src/app/admin/dpp/[id]/analysis/page.tsx');
fixHeader('src/app/teacher/dpp/[id]/analysis/page.tsx');
