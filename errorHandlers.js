// Error handling function
function handleError(error, req, res, next) {
  // Uncomment the following line to enable email notifications for errors
  // sendMail(addHeader() + error + "<br><br>" + addFooter(false), 'DKA Calculator error notification', 'admin@dka-calculator.co.uk', 'DKA Calculator');

  res.status(500).json({
    message:
      "Sorry, an unexpected error has occurred. This event has been logged. If you keep seeing this message please contact admin@dka-calculator.co.uk including the error message below and a description of what you were doing when it appeared.",
    error: error.message.replace(/[^\x20-\x7E]/g, ""), // Removing control characters
  });
}

// Middleware for sending custom error responses
function sendErrorResponse(msg, status, res) {
  //res.status(status).json({ message: msg });
  res.send("sendErrorResponse");
}

module.exports = { handleError, sendErrorResponse };
