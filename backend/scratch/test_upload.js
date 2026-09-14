import fs from 'fs';
import path from 'path';

async function testUpload() {
  const csvContent = `Train No,Train Name,Source Station,Destination Station,Departure Time,Arrival Time
12951,MUMBAI RAJDHANI,MMCT,NDLS,16:00,08:32
12952,NEW DELHI RAJDHANI,NDLS,MMCT,16:55,08:35
12001,SHATABDI EXP,NDLS,RKMP,06:00,14:40`;

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const formData = new FormData();
  formData.append('file', blob, 'sample_timetable.csv');

  const res = await fetch('http://localhost:5000/api/import/trains', {
    method: 'POST',
    body: formData
  });

  const json = await res.json();
  console.log('Upload Result:', JSON.stringify(json, null, 2));
}

testUpload();
