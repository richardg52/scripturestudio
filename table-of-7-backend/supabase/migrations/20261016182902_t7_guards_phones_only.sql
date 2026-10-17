-- The seat guards are for signed-in phones. The database owner (SQL editor, maintenance) is not a seat.
drop trigger g_members on members;   create trigger g_members before update on members for each row when (auth.role() = 'authenticated') execute function private.g_members();
drop trigger g_contacts on contacts; create trigger g_contacts before insert or update on contacts for each row when (auth.role() = 'authenticated') execute function private.g_contacts();
drop trigger g_events on events;     create trigger g_events before insert or update on events for each row when (auth.role() = 'authenticated') execute function private.g_events();
drop trigger g_reviews on reviews;   create trigger g_reviews before update on reviews for each row when (auth.role() = 'authenticated') execute function private.g_held();
drop trigger g_notes on notes;       create trigger g_notes before update on notes for each row when (auth.role() = 'authenticated') execute function private.g_held();
drop trigger g_media on media;       create trigger g_media before insert or update on media for each row when (auth.role() = 'authenticated') execute function private.g_media();
drop trigger g_cards on cards;       create trigger g_cards before insert or update on cards for each row when (auth.role() = 'authenticated') execute function private.g_cards();
drop trigger g_tickets on tab_tickets; create trigger g_tickets before insert or update on tab_tickets for each row when (auth.role() = 'authenticated') execute function private.g_tickets();
