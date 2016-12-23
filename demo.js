var SmartStart = require('smartstart');

var car = new SmartStart({
  username: 'foo@bar.com',
  password: 'foobar123'
});

var command = process.argv[2];

switch (command) {
  case 'lock':
  case 'arm':
    car.arm(function(err, result) {
      if (err) return console.error(err);
      console.log('Sent lock command');
    });
    break;

  case 'unlock':
  case 'disarm':
    car.disarm(function(err, result) {
      if (err) return console.error(err);
      console.log('Sent unlock command');
    });
    break;

  case 'start':
    car.start(function(err, result) {
      if (err) return console.error(err);
      console.log('Sent start command');
    });
    break;

  case 'stop':
    car.stop(function(err, result) {
      if (err) return console.error(err);
      console.log('Sent stop command');
    });
    break;

  case 'speed':
    car.topSpeed(function(err, result) {
      if (err) return console.error(err);

      try {
        console.log(result.Return.Results.Device.FastestSpeed);
      } catch (ex) {
        console.error('Could not get the top speed');
      }
    });
    break;

  case 'location':
    car.locate(function(err, result) {
      if (err) return console.error(err);

      try {
        var address = result.Return.Results.Device.Address.split('\t');

        if (address.length) {
          address.pop();
          console.log(address.join(', '));
        } else {
          console.error('Could not locate the car (1)');
        }
      } catch (ex) {
        console.error('Could not locate the car (2)');
      }
    });
    break;

  default:
    console.error('Unknown command:', command);
    console.error('Available commands are: lock|arm, unlock|disarm, start, stop, speed, location');
    break;
}
