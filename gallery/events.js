/* ------------------------------------------------------------------
   Events & Gallery — content
   To add an event: append an object to this array. Nothing else to edit.
   Every event's photos play in the homepage "In the Room" carousel
   automatically; featured:true just puts that event's photos first.
   Photos are displayed uncropped, so any credit baked into an image
   stays visible. Optional per-event `credit` is shown in the viewer.
   ------------------------------------------------------------------ */
window.GALLERY_EVENTS = [
  {
    id: 'book-release-launch',
    title: 'Book Release Launch',
    category: 'Book Launch',
    year: '2026',
    featured: true,
    tagline: 'Three books. Three perspectives. One important conversation.',
    description: 'A community gathering for the release of Not Alone, The Repositioning of the Ijaw Nation, and Nigeria: A Lie?',
    credit: 'Photography © Otech Digital Photos',
    photos: [
      { src: 'images/book-launch/book-launch-01.jpeg', w: 1100, h: 1600, caption: 'Edward Agbai with guests at the Book Release Launch', alt: 'Edward Agbai standing with two guests in front of the Book Release Launch banner' },
      { src: 'images/book-launch/book-launch-02.jpeg', w: 1066, h: 1600, caption: 'Edward Agbai addressing guests', alt: 'Edward Agbai speaking at a podium during the book launch' },
      { src: 'images/book-launch/book-launch-03.jpeg', w: 1600, h: 1066, caption: 'Launch copies of Not Alone and The Repositioning of the Ijaw Nation', alt: 'Stacks of Not Alone and The Repositioning of the Ijaw Nation on the launch table while guests look on' },
      { src: 'images/book-launch/book-launch-04.jpeg', w: 1600, h: 1094, caption: 'Guests and supporters gathered for the launch', alt: 'Group photo of guests and supporters in front of the Book Release Launch banner' },
      { src: 'images/book-launch/book-launch-05.jpeg', w: 1600, h: 1587, caption: 'Guests celebrating the launch', alt: 'Seven guests posing together at the book launch, one wearing a Book Launch sash' },
      { src: 'images/book-launch/book-launch-06.jpeg', w: 1178, h: 1600, caption: 'Edward with guests', alt: 'Edward Agbai posing with three guests in front of the launch banner' },
      { src: 'images/book-launch/book-launch-07.jpeg', w: 1521, h: 1600, caption: 'Guests at the launch', alt: 'Three guests smiling in front of the Book Release Launch banner, one giving a thumbs-up' }
    ]
  },
  {
    id: 'rbc-leadership-forum',
    title: 'Leadership Forum — RBC',
    category: 'Speaking',
    year: '',
    featured: false,
    tagline: '',
    description: '',
    credit: '',
    photos: [
      { src: 'images/events/rbc-leadership-forum.jpg', w: 900, h: 599, caption: 'Leadership Forum — RBC', alt: 'Edward Agbai at the RBC Leadership Forum' }
    ]
  },
  {
    id: 'the-well-leader-conference',
    title: 'The Well Leader Conference',
    category: 'Speaking',
    year: '',
    featured: false,
    tagline: '',
    description: '',
    credit: '',
    photos: [
      { src: 'images/events/the-well-leader-conference.jpg', w: 900, h: 599, caption: 'The Well Leader Conference', alt: 'Edward Agbai at The Well Leader Conference' }
    ]
  }
];
