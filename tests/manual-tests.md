# Content Manager Testing Checklist

## Analytics Tracking

- [ ] Open browser console
- [ ] Enable analytics in privacy settings
- [ ] Click each social link
- [ ] Verify 'social_link_click' events in console
- [ ] Check event data contains correct link and href

## Error Handling

- [ ] Remove 'connect-links' div temporarily
- [ ] Check console for error message
- [ ] Verify error tracking event fired
- [ ] Confirm page doesn't crash

## Social Links

- [ ] All social icons visible
- [ ] Correct URLs on hover
- [ ] Icons render properly
- [ ] Aria labels present

## Analytics Disabled

- [ ] Disable analytics in privacy settings
- [ ] Click social links
- [ ] Verify no tracking events fire
- [ ] Confirm links still work
