/* ------------------------------------------------------------------
   Press & Media — content
   Everything on the Press & Media tab is driven from this file.

   To add coverage, append to `coverage`:
     { type: 'Article' | 'Interview' | 'Podcast' | 'Video' | 'Feature',
       outlet: 'Publication or show name',
       title: 'Headline or episode title',
       date: 'Mar 2027',            // free text, shown as-is
       url: 'https://...' }          // must be http(s)
   Appearances are pulled automatically from gallery/events.js.
   ------------------------------------------------------------------ */
window.GALLERY_MEDIA = {
  summary: 'Scholar, strategist, and author with 34 years across oil & gas, academia, and consulting — bridging African policy and global opportunity.',

  kit: {
    label: 'Request Press Kit',
    inquiryType: 'Press / Media',
    note: 'Biography, high-resolution photography, and speaking materials — shared on request.'
  },

  /* As presented at the Book Release Launch (titles and bylines per the book covers). */
  booksNote: 'As presented at the Book Release Launch',
  books: [
    { title: 'Not Alone', subtitle: 'Turning Discouragement into Purpose', byline: 'Edward Agbai' },
    { title: 'The Repositioning of the Ijaw Nation', subtitle: 'From Docility to Strategic Alignment and the Birth of a New Nation Movement', byline: 'Edward Agbai' },
    { title: 'Nigeria: A Lie?', subtitle: 'Historical Perspectives, Volume One', byline: 'Edited by Victor Osadebamwen Amadin, M.Sc.' }
  ],

  topics: [
    'Leadership & Organizational Change',
    'Contemporary Global Issues',
    'Mentorship & Human Development',
    'African Policy & Research',
    'Canada–Africa Partnerships'
  ],

  organizations: [
    { name: 'African Policy and Research Consortium', role: 'Convener & Deputy Executive Coordinator' },
    { name: 'Crestwood Consulting Corporation', role: 'Co-Founder & Managing Partner' },
    { name: 'Prairies Africa Partnership', role: 'Executive Director' }
  ],

  coverage: []
};
