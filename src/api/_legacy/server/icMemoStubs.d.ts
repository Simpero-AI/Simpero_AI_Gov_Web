/**
 * IC voting block: stubbed members per firm. A future ic_members table will
 * replace these placeholders with real per-firm membership; until then, two
 * members are fixed and the signed-in user fills the third slot so the IC
 * Recommendation panel renders a complete three-member voting row.
 */
export interface ICVotingMemberStub {
    name: string;
    role: string;
    isCurrentUser: boolean;
}
export interface VotingStubContext {
    /** Display name for the signed-in IC voter. Defaults to "Current User". */
    currentUserName?: string;
    /** Display role for the signed-in IC voter. Defaults to "Partner". */
    currentUserRole?: string;
}
export declare function getStubVotingMembers(ctx: VotingStubContext): ICVotingMemberStub[];
