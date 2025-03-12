const http = require('http');

http.createServer((req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Server IP: ${ip}\n`);
}).listen(3000, () => {
    console.log('Test server running on port 3000');
});
