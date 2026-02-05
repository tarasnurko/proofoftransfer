# UI Implementation Specification - Proof of Transfer

**Purpose:** Complete UI specification combining requirements with v0 implementation details. Describes components, layout, positioning, and flow WITHOUT styling specifics.

**Tech Stack:** Next.js 16, React, TailwindCSS, shadcn/ui components

---

## Routes & Pages

| Route | Page | Layout |
|-------|------|--------|
| `/` | Home - Claims List | Header + Claims Grid + Pagination |
| `/create` | Create Claim | Header + Form |
| `/claims/[id]` | Claim Details | Header + Single Column Sections |
| `/claims/[id]/proofs/[proofId]` | Proof Details | Header + Single Column Sections |

---

## General Layout

### Header Component (all pages)

**Structure:** Single row with left and right sections

**Left Section:**
- Logo text "PROOF OF TRANSFER" (clickable link to `/`)

**Right Section (horizontal button group):**
- "All Claims" button → links to `/`
- "Create Claim" button → links to `/create`
- Connect Wallet button
  - Disconnected: shows "Connect Wallet"
  - Connected: shows truncated address `0x1234...5678`
- Theme Switcher button (sun/moon icon)

**Button Consistency:**
- All buttons same size
- All buttons same variant/style
- Theme toggle uses native button element with icon sizing matching other buttons

---

## Page: Home (`/`)

### Layout Structure

```
[Title Section]
[Filters Section]
[Claims Grid]
[Pagination Controls]
```

### Title Section

- Page title
- Subtitle

### Filters Section

**Components (horizontal layout):**

1. **Search Input** - searches by:
   - Claim message text
   - Recipient address
   - Token address
   - Claim message hash

2. **Chain Filter Dropdown** - selects specific chain or "All Chains"

3. **Sort Dropdown** - options:
   - Newest First
   - Oldest First
   - Most Proofs
   - Least Proofs

**Behavior:**
- Filters apply in real-time
- Reset pagination to page 1 when filters change

### Claims Grid

**Layout:**
- Responsive grid: 1 column mobile, 2 columns desktop
- Cards equal height within row
- Loading/Error/Empty states

### Claim Card Component

**Structure:** Card with header, content sections, footer

**Header:**
- Claim ID (truncated, with copy icon)
- Proof count badge (must not wrap text - use `whitespace-nowrap`)

**Content Sections:**

1. **Message Section:**
   - Full claim message text

2. **Fields Grid (3 columns: icon | label | value):**
   - Chain: icon + label + chain name
   - Token: icon + label + token name/symbol (or address) + copy icon
   - Recipient: icon + label + address (truncated, supports ENS like "vitalik.eth") + copy icon
   - Amount: icon + label + amount range or constraints
   - Period: icon + label + date range or constraints
   - Created: icon + label + formatted date

**Footer:**
- "View Details" button aligned to bottom (use `mt-auto`)

**Field Alignment:**
- Use 3-column grid: `[icon: 20px] [label: 70px] [value: flex]`
- Ensures all values align vertically across different cards

### Pagination Component

**Appearance:** Shows when items > page size (10 per page)

**Controls:**
- Previous button (disabled on first page)
- Page numbers (clickable)
- Next button (disabled on last page)

---

## Page: Create Claim (`/create`)

### Layout Structure

```
[Title Section]
[Form Sections]
[Form Actions]
```

### Form Structure

**Section 1: Claim Message**
- Textarea input
- Character count display
- Validation: 10-1000 characters

**Section 2: Token Information**
- Chain select dropdown (default: Base)
- Token address input (with validation feedback)
- Auto-fetch token info on valid address
- Display: token name, symbol, decimals when found
- Recipient address input

**Section 3: Amount Constraints (Optional)**
- Min amount input
- Max amount input
- Help text: "Leave as 0 for no constraint"

**Section 4: Time Range (Optional)**
- From date picker (cannot be future)
- To date picker (must be after from date)
- Clear buttons on date pickers

**Form Actions (horizontal buttons):**
- "Cancel" button → returns to home
- "Create Claim" button (primary) → submits form

**Form States:**
- Loading state during submission
- Success: redirect to home + show toast
- Error: inline validation errors

**Backend Flow (automatic on submit):**
1. Validate form data
2. Fetch ALL transfers matching constraints from Etherscan
3. Save transfers to database (cache)
4. Build merkle tree from transfers
5. Create claim with merkle root
6. If no matching transfers found → claim creation fails

---

## Page: Claim Details (`/claims/[id]`)

### Layout Structure

```
[Navigation Links]
[Claim Details Card]
[Transfers Section]
[Generate Proof Section]
[Proofs Section with Filters]
[Pagination]
```

### Navigation

**Position:** Same row as "Copy Link" button

**Elements:**
- "Back to claims" - TEXT LINK (not button, to avoid padding)
- "Copy Link" button - copies current claim URL

### Claim Details Card

**Structure:** Grid layout for field display

**Fields:**
- ID (full UUID, copy icon)
- Message (full text)
- Chain (name)
- Token Address (with name/symbol if available, copy icon)
- Recipient Address (truncated, ENS support, copy icon)
- Min/Max Amounts (formatted with decimals)
- From/To Dates (formatted or "No start/end date")
- Merkle Root (hash with copy icon)
- Created At (formatted timestamp)

**Merkle Root Layout:**
- Label and value properly separated in grid columns

### Transfers Section

**Position:** First major section after claim details

**Auto-Load Behavior:**
- Transfers displayed automatically on page load
- Uses cached transfers from database (fetched during claim creation)
- Transfer count display

**When Wallet NOT Connected:**
- Shows all transfers
- No filter toggle

**When Wallet Connected:**
- Filter toggle appears: "All Transfers" / "My Transfers Only"
- User's transfers highlighted with "You" badge
- Highlight uses accent color for visual distinction

**Transfer Card:**
- From address (Address component with copy)
- Amount (formatted with token decimals)
- Date (formatted timestamp)
- Transaction hash (link to block explorer)

### Generate Proof Section

**Position:** After Transfers section

**Flow Structure (linear steps):**

**Step 1: Connect Wallet**
- If not connected: "Connect Wallet" prompt
- If connected: show connected address

**Step 2: Sign Message**
- "Sign Message" button
- User signs with wallet
- **After signing:** display generated nullifier (hash with copy icon)

**Step 3: Generate ZK Proof**
- "Generate ZK Proof" button (enabled only if user has matching transfers + signed message)
- Progress indicator during generation
- When complete, display:
  - Nullifier
  - Proof data (collapsible/truncated)
  - Transfers root hash

**Step 4: Submit Proof**
- "Submit Proof" button
- Loading state during submission
- Success: refresh page, show toast
- Error: show error message

### Proofs Section

**Position:** AFTER Generate Proof section (NOT before, NOT beside)

**Title:** "Submitted Proofs" with count

**Filters (horizontal layout):**
- Search input (by nullifier or proof ID)
- Sort dropdown (Newest First / Oldest First)

**Layout:** Grid

**Grid Responsiveness:**
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns

**Pagination:** 9 proofs per page

**Proof Card:**

**Structure:** Clickable card linking to `/claims/[id]/proofs/[proofId]`

**Content:**
- Proof ID (truncated, copy icon)
- Nullifier (truncated, copy icon)
- Created At (formatted date)
- Verification Status Badge

**Verification Status Display:**
- Unverified: neutral badge
- Verified (valid): success badge with checkmark
- Verified (invalid): error badge with X

**Hover Behavior:**
- Card has hover effect
- Use non-accent hover background so checkmark icon remains visible

---

## Page: Proof Details (`/claims/[id]/proofs/[proofId]`)

### Layout Structure

```
[Navigation Links]
[Claim Information Card]
[Proof Details Card]
[Verification Section]
```

### Navigation

**Position:** Same row as "Copy Link" button

**Elements:**
- "Back to claims" - TEXT LINK
- "Copy Link" button - copies current proof URL

### Claim Information Card

**Content:** Same fields as claim details page (condensed view)
- ID, Message, Chain, Token, Recipient, Amount constraints, Date range, Merkle Root

### Proof Details Card

**Fields:**
- Proof ID (full UUID, copy icon)
- Nullifier (full hash, copy icon)
- Created At (formatted timestamp)
- Verification Status (badge)
- Proof Data (collapsible/truncated hex data)
- Public Inputs (formatted JSON or structured display)
- Transfers Root Hash (hash with copy icon)
- Prover Address (if available, Address component)

### Verification Section

**Purpose:** Allow users to verify proof validity

**Method Options (user chooses one):**

1. **Fetch from Blockchain**
   - "Fetch Transfers" button
   - Fetches transfers from Etherscan API
   - Loading state during fetch

2. **Upload CSV File**
   - File input component
   - Accepts CSV files downloaded from Etherscan
   - Parses CSV and extracts transfer data

**After Transfers Loaded (either method):**

**Collapsible Transfers Display:**
- Use `<details>` element or similar collapsible component
- Shows all loaded transfers in list format
- Each transfer shows: from, amount, date, tx hash

**Verify Button:**
- "Verify Proof" button becomes enabled
- Triggers server-side verification
- Loading state during verification
- Result displayed in badge/status

---

## Components Library

### Layout Components

**PageContainer**
- Wraps page content
- Provides consistent max-width and padding

**Header**
- Fixed top navigation
- Logo, action buttons, wallet, theme toggle

### Form Components

**Input**
- Text input with label
- Error state display
- Inline validation feedback

**Textarea**
- Multi-line input
- Character count
- Error state

**Select**
- Dropdown with label
- Default value support
- Option groups for chains

**DatePicker**
- Calendar popup
- Clear button
- Future date disable option

**FileInput**
- File upload for CSV
- Accepted file types display
- Upload progress

**Button**
- Variants: default, secondary, outline, ghost
- Sizes: default, sm, icon
- Loading state
- Disabled state

### Display Components

**Card**
- Container for content sections
- Header, content, footer slots
- Border styling

**Badge**
- Status indicators (proof count, verification)
- Variants: default, success, error, neutral
- Must prevent text wrapping with `whitespace-nowrap`

**Address**
- Truncated address display `0x1234...5678`
- Copy icon button
- ENS name support (e.g., "vitalik.eth")
- Copy feedback (checkmark appears)

**CopyHash**
- Truncated hash display
- Copy icon button
- Copy feedback

**CopyLinkButton**
- Button to copy current page URL
- Checkmark feedback on success

**Link**
- Text links for navigation
- Used for "Back to" navigation
- Avoids button padding

### State Components

**LoadingState**
- Spinner with message
- Centered display

**ErrorState**
- Error message display
- Optional retry action

**EmptyState**
- Empty list message
- Optional call-to-action button

### Feedback Components

**Toast**
- Success/error notifications
- Auto-dismiss
- Positioned top-right or bottom-center

### Interaction Components

**Collapsible / Details**
- Expandable content sections
- Used for transfers list in verification
- Arrow/chevron indicator

**FilterControls**
- Search input
- Dropdown filters
- Sort dropdown
- Horizontal layout with spacing

**PaginationControls**
- Previous/Next buttons
- Page number buttons
- Disabled states
- Current page highlight

---

## Data Flow & Behaviors

### Create Claim Flow

1. User fills form
2. Submits form
3. **Backend automatically:**
   - Fetches ALL matching transfers from Etherscan
   - Saves transfers to database (cache)
   - Builds merkle tree
   - Creates claim with merkle root
4. Redirects to home
5. Toast shows success

### View Claim Details Flow

1. Navigate to claim details page
2. **Auto-load on page mount:**
   - Fetch claim data
   - Fetch cached transfers from DB
   - Fetch submitted proofs
3. Display all sections
4. If wallet connected:
   - Highlight user's transfers
   - Show filter toggle

### Generate Proof Flow

1. User connects wallet
2. User signs message → nullifier displayed
3. User clicks "Generate ZK Proof"
4. Progress indicator shown (client-side proof generation)
5. When complete, display proof data
6. User clicks "Submit Proof"
7. Proof saved to database
8. Page refreshes, proof appears in list

### Verify Proof Flow

1. Navigate to proof details page
2. User chooses verification method:
   - **Option A:** Click "Fetch Transfers" → load from blockchain
   - **Option B:** Upload CSV file → parse and load
3. Transfers display in collapsible section
4. Click "Verify Proof"
5. Server verifies proof
6. Verification status updates

---

## Pagination Behavior

### Claims List (Home Page)

- **Items per page:** 10
- **Pagination appears:** When total claims > 10
- **Reset trigger:** Filter/sort changes

### Proofs List (Claim Details)

- **Items per page:** 9
- **Layout:** 3-column grid (mobile: 1, tablet: 2, desktop: 3)
- **Pagination appears:** When total proofs > 9
- **Reset trigger:** Filter/sort changes

---

## Filter/Sort Behavior

### Claims Filters

**Search:**
- Searches in: message, recipient, token address, message hash
- Case-insensitive
- Debounced input

**Chain Filter:**
- Dropdown with all supported chains
- "All Chains" option
- Single selection

**Sort:**
- Newest First (default)
- Oldest First
- Most Proofs
- Least Proofs

### Proofs Filters

**Search:**
- Searches in: nullifier, proof ID
- Case-insensitive
- Debounced input

**Sort:**
- Newest First (default)
- Oldest First

### Implementation

- Client-side filtering using `useMemo`
- Pagination resets to page 1 when filters change
- Filter state persists during navigation within page

---

## Copy Functionality

### Copy Button Behavior

**All copy buttons (Address, CopyHash, CopyLinkButton):**
- Idle state: Copy icon
- Click: Copies to clipboard
- Success state: Green checkmark icon (2 seconds)
- Auto-resets to copy icon

**Consistency:**
- Same icon size across all components
- Same button styling
- Same checkmark color (accent green)
- Same transition timing

### Copy Icon Placement

**Claim Card:**
- Token address: copy icon inline
- Recipient address: copy icon inline

**Claim Details:**
- Claim ID: copy icon inline
- Token address: copy icon inline
- Merkle root: copy icon inline

**Proof Details:**
- Proof ID: copy icon inline
- Nullifier: copy icon inline

**Transfers:**
- From address: copy via Address component

---

## Supported Chains

| Chain | ID | Display Name |
|-------|-----|-------------|
| Ethereum | 1 | Ethereum |
| Optimism | 10 | Optimism |
| BNB Chain | 56 | BNB Chain |
| Polygon | 137 | Polygon |
| Base | 8453 | Base |
| Arbitrum | 42161 | Arbitrum |
| Scroll | 534352 | Scroll |

**Usage:**
- Chain select: shows display name
- Claim cards: shows display name with icon
- Helper function: `getChainName(chainId) => string`

---

## ENS Support

**Behavior:**
- Accept ENS names (e.g., "vitalik.eth") in recipient address fields
- Display ENS name instead of full address when available
- Still show copy icon for copying full address
- Example mock data includes ENS name

---

## Responsive Breakpoints

### Grid Layouts

**Claims Grid:**
- Mobile (< 768px): 1 column
- Desktop (≥ 768px): 2 columns

**Proofs Grid:**
- Mobile (< 768px): 1 column
- Tablet (768px - 1024px): 2 columns
- Desktop (≥ 1024px): 3 columns

### Component Adjustments

- Header: Stack buttons vertically on mobile
- Filters: Stack vertically on mobile, horizontal on desktop
- Claim card grid: Adjust icon/label/value column widths on mobile

---

## State Management

### Page-Level State

**Home Page:**
- Claims data (fetched from API)
- Search query
- Selected chain filter
- Selected sort order
- Current page number
- Loading state
- Error state

**Claim Details:**
- Claim data
- Transfers data (auto-fetched from cache)
- Proofs data
- Wallet connected state
- User's transfers count
- Show only user's transfers toggle
- Nullifier (after signing)
- Generated proof data
- Proof search query
- Proof sort order
- Current page number

**Proof Details:**
- Claim data
- Proof data
- Transfers data (loaded from fetch or CSV)
- Verification status
- CSV file state
- Loading states

### Client-Side Filtering

- Use `useMemo` for filtered/sorted data
- Filter before pagination
- Paginate filtered results

---

## Theme Toggle Implementation

**Component:** Native button element (not Button component for direct control)

**Sizing:** `h-9 w-9` to match other header buttons

**Icon:** Sun for light mode, Moon for dark mode

**Theme Detection:**
- Use `resolvedTheme` from next-themes
- Fallback: MutationObserver watching `dark` class on HTML element
- Handles hydration mismatches

**Storage:** Persists via `next-themes` with localStorage

---

## Error Handling

### Form Validation

- Inline errors below each field
- Error state styling on inputs
- Submit button disabled until valid
- Toast on submission error

### API Errors

- Display error state component
- Show user-friendly message
- Optional retry action
- Log errors to console

### Not Found States

- Claim not found: redirect to home
- Proof not found: redirect to claim details
- Empty results: show empty state with message

---

## Notes on Implementation

### Key Differences from Initial Spec

1. **Transfers auto-load** - Not fetched on demand, cached during claim creation
2. **Sign message step** - Added before proof generation to create nullifier
3. **Proofs in grid** - Not vertical list, uses responsive grid
4. **Separate proof details page** - Verification happens on dedicated page, not inline
5. **CSV upload option** - Alternative to blockchain fetch for verification
6. **ENS support** - Recipient addresses can display ENS names
7. **Copy functionality everywhere** - All hashes, addresses, IDs have copy buttons
8. **Link-based navigation** - "Back to" uses text links, not buttons

### Component Reusability

- Address component used across all pages
- CopyHash used for all hash displays
- Card component used for claims, proofs, sections
- Badge component used for proof counts, verification status
- Same Filter/Sort/Pagination components on multiple pages

### Performance Considerations

- Client-side filtering with memoization
- Pagination to limit rendered items
- Debounced search inputs
- Lazy load heavy components (proof generation UI)

---

**End of Specification**
