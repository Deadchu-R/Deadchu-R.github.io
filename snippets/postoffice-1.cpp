// CustomerList.cpp: a hand-written doubly linked list.
// Insert a customer so the queue stays sorted by the service they need.
Node* customerList::insertSorted(Node* sortedHead, Node* newNode)
{
    if (sortedHead == nullptr || newNode->data.actionType < sortedHead->data.actionType)
    {
        newNode->next = sortedHead;
        if (sortedHead != nullptr) sortedHead->prev = newNode;
        return newNode;                            // new head
    }

    Node* current = sortedHead;
    while (current->next != nullptr && current->next->data.actionType <= newNode->data.actionType)
        current = current->next;

    newNode->next = current->next;
    if (current->next != nullptr) current->next->prev = newNode;
    current->next = newNode;
    newNode->prev = current;
    return sortedHead;
}
