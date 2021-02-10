const options = { method: 'GET' };

fetch('https://streamlabs.com/api/v1.0/authorize', options)
    .then(response => console.log(response))
    .catch(err => console.error(err));
// Events will be sent when someone followers
// Please use event listeners to run functions.
document.addEventListener('goalLoad', function(obj) {
    $('#currpercent').text(100 * (obj.detail.amount.current / obj.detail.amount.target) + '%');
    $('#bgpercent').width(300 * (obj.detail.amount.current / obj.detail.amount.target));
    // obj.detail will contain information about the current goal
    // this will fire only once when the widget loads
    console.log(obj.detail);
    $('#title').html('<strong>' + obj.detail.title + '</strong>' + '<br/><strong style="color:#b28080ff;">' + (obj.detail.amount.target - obj.detail.amount.current) + '</strong> follows to go!');
    $('#goal-current').text(obj.detail.amount.current);
    $('#goal-total').text(obj.detail.amount.target);
    $('#goal-end-date').text(obj.detail.to_go.ends_at);
});
document.addEventListener('goalEvent', function(obj) {
    $('#currpercent').text(100 * (obj.detail.amount.current / obj.detail.amount.target) + '%');
    $('#bgpercent').width(300 * (obj.detail.amount.current / obj.detail.amount.target));
    $('#title').html(obj.detail.title + '<br/><strong>' + (obj.detail.amount.target - obj.detail.amount.current) + '</strong> follows to go!');
    // obj.detail will contain information about the goal
    $('#bgpercent').width(300 * (obj.detail.amount.current / obj.detail.amount.target));
    $('#goal-current').text(obj.detail.amount.current);
    $('#currpercent').html(100 * (obj.detail.amount.current / obj.detail.amount.target) + '%');
});