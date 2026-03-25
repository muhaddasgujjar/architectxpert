const { exec } = require('child_process');
exec('git push -u origin main', (error, stdout, stderr) => {
  console.log('STDERR:\n', stderr);
  console.log('STDOUT:\n', stdout);
});
