import { dbAll, dbRun } from '../database/db.js';

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

function minutesToTime(mins) {
  const m = Math.max(0, Math.floor(mins)) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export async function calculateBlockTrainImpacts(block, trains = [], sections = []) {
  if (!block || !block.section_id) return [];

  const blockStart = block.start_minute || timeToMinutes(block.start_time);
  const blockEnd = block.end_minute || timeToMinutes(block.end_time);
  const secId = block.section_id;

  // Filter trains running on the blocked section
  const sectionTrains = trains.filter(t => (t.section_id === secId || t.route?.includes(secId)));

  const impacts = [];

  // Alternative routes mapping
  const diversionRoutes = {
    'SEC-A01': { route: 'SEC-C01 -> SEC-C02 (Central Bypass)', extra_mins: 18 },
    'SEC-B01': { route: 'SEC-D01 -> SEC-D02 (Northern Loop)', extra_mins: 25 },
    'SEC-C01': { route: 'SEC-E01 -> SEC-E02 (NCR Sub-line)', extra_mins: 15 },
    'SEC-E01': { route: 'SEC-A01 -> SEC-H01 (Northern Bypass)', extra_mins: 20 }
  };

  for (const train of sectionTrains) {
    const depMins = timeToMinutes(train.departure_time);
    const arrMins = timeToMinutes(train.arrival_time);

    // Overlap check
    const hasOverlap = (depMins >= blockStart && depMins <= blockEnd) ||
                       (arrMins >= blockStart && arrMins <= blockEnd) ||
                       (depMins <= blockStart && arrMins >= blockEnd);

    let action = 'PASS';
    let expectedHold = 0;
    let expectedDelay = 0;
    let diversionRoute = null;
    let reason = 'Operates outside maintenance block possession window.';
    let overlapMins = 0;

    if (hasOverlap) {
      overlapMins = Math.min(blockEnd, arrMins || blockEnd) - Math.max(blockStart, depMins);
      const holdTimeMins = Math.max(5, blockEnd - depMins);

      const isHighPriority = train.train_type?.includes('Vande Bharat') || train.train_type?.includes('Shatabdi') || train.train_type?.includes('Rajdhani') || train.priority === 'HIGH';
      const divOption = diversionRoutes[secId];

      if (divOption && isHighPriority) {
        action = 'DIVERT';
        diversionRoute = divOption.route;
        expectedDelay = divOption.extra_mins;
        reason = `Diverted via ${divOption.route} to prevent ${holdTimeMins}m hold for high-priority service.`;
      } else {
        action = 'HOLD';
        expectedHold = holdTimeMins;
        expectedDelay = holdTimeMins;
        reason = `Held at section entry station until block release at ${minutesToTime(blockEnd)}.`;
      }
    }

    const impactRecord = {
      block_id: block.block_id,
      train_number: train.train_number,
      train_name: train.train_name,
      scheduled_time: `${train.departure_time} - ${train.arrival_time}`,
      block_overlap_mins: Math.max(0, overlapMins),
      action,
      expected_hold_mins: expectedHold,
      expected_delay_mins: expectedDelay,
      diversion_route: diversionRoute,
      reason
    };

    impacts.push(impactRecord);

    // Save/update in database
    await dbRun(
      `INSERT INTO train_impacts (block_id, train_number, train_name, scheduled_time, block_overlap_mins, action, expected_hold_mins, expected_delay_mins, diversion_route, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        impactRecord.block_id, impactRecord.train_number, impactRecord.train_name,
        impactRecord.scheduled_time, impactRecord.block_overlap_mins, impactRecord.action,
        impactRecord.expected_hold_mins, impactRecord.expected_delay_mins, impactRecord.diversion_route, impactRecord.reason
      ]
    ).catch(() => {});
  }

  return impacts;
}
