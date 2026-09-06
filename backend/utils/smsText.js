function getBookingSMS({ farmerName, centreName, token, date, time }) {
    return `KisanQ: Hello ${farmerName}! Your procurement slot is confirmed.

Centre: ${centreName}
Token: ${token}
Date: ${date}
Time: ${time}

Please reach the procurement centre on time.`;
}

function getQueueSMS({ farmerName, token, peopleAhead }) {
    return `KisanQ: Hello ${farmerName}! Your token ${token} is active.

People ahead of you: ${peopleAhead}

You will receive another update when your turn is near.`;
}

module.exports = {
    getBookingSMS,
    getQueueSMS
};