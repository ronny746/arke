const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');

async function run() {
  const token = jwt.sign(
      { userId: '6a744777887ec317762bb0ba', role: 'student', instituteId: '6a5b32ad33f77381c3780740' }, 
      'supersecretjwtkey', 
      { expiresIn: '1d' }
  );
  try {
    const res = await axios.get('http://localhost:3000/api/v1/batches/my-batches', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.log('Error:', err.response ? err.response.data : err.message);
  }
}
run();
